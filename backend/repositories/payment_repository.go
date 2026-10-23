package repositories

import (
	"context"
	"ironcoach/database"
	"ironcoach/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type PaymentRepository struct {
	collection *mongo.Collection
}

func NewPaymentRepository() *PaymentRepository {
	return &PaymentRepository{collection: database.Database().Collection("payments")}
}

// Create inserts a payment, with the same client_id idempotency as packages.
func (r *PaymentRepository) Create(pay models.Payment) (saved models.Payment, created bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid := primitive.NewObjectID()
	pay.ID = ""
	doc, err := toDocWithID(pay, oid)
	if err != nil {
		return models.Payment{}, false, err
	}
	if _, err := r.collection.InsertOne(ctx, doc); err != nil {
		if pay.ClientID != "" && mongo.IsDuplicateKeyError(err) {
			var existing models.Payment
			findErr := r.collection.FindOne(ctx, bson.M{"trainee_id": pay.TraineeID, "client_id": pay.ClientID}).Decode(&existing)
			return existing, false, findErr
		}
		return models.Payment{}, false, err
	}
	pay.ID = oid.Hex()
	return pay, true, nil
}

// FindByID returns mongo.ErrNoDocuments for unknown or malformed ids.
func (r *PaymentRepository) FindByID(id string) (models.Payment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var pay models.Payment
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return pay, mongo.ErrNoDocuments
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": oid}).Decode(&pay)
	return pay, err
}

// ListByTrainee returns the payments of one client, newest first.
func (r *PaymentRepository) ListByTrainee(traineeID string, limit, offset int) ([]models.Payment, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	opts := options.Find().
		SetSort(bson.D{{Key: "date", Value: -1}, {Key: "created_at", Value: -1}}).
		SetLimit(int64(limit)).
		SetSkip(int64(offset))
	cursor, err := r.collection.Find(ctx, bson.M{"trainee_id": traineeID}, opts)
	if err != nil {
		return nil, err
	}
	pays := []models.Payment{}
	if err := cursor.All(ctx, &pays); err != nil {
		return nil, err
	}
	return pays, nil
}

// Delete removes one payment. found=false means no payment has that id.
func (r *PaymentRepository) Delete(id string) (found bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return false, nil
	}
	res, err := r.collection.DeleteOne(ctx, bson.M{"_id": oid})
	if err != nil {
		return false, err
	}
	return res.DeletedCount > 0, nil
}

// DeleteByTrainees deletes all payments of the given trainees.
func (r *PaymentRepository) DeleteByTrainees(traineeIDs []string) error {
	return deleteByTrainees(r.collection, traineeIDs)
}

// TotalsByTrainees returns the summed payment amount (paise) per trainee in one query.
func (r *PaymentRepository) TotalsByTrainees(traineeIDs []string) (map[string]int64, error) {
	return sumAmountByTrainee(r.collection, traineeIDs)
}
