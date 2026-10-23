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

// maxPackagesPerClient bounds the packages read for one client (a client has a handful).
const maxPackagesPerClient = 200

type PackageRepository struct {
	collection *mongo.Collection
}

func NewPackageRepository() *PackageRepository {
	return &PackageRepository{collection: database.Database().Collection("packages")}
}

// Create inserts a package. When the app supplies a client_id and a package with the same
// (trainee_id, client_id) exists, the existing one is returned with created=false.
func (r *PackageRepository) Create(pkg models.Package) (saved models.Package, created bool, err error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	oid := primitive.NewObjectID()
	pkg.ID = ""
	doc, err := toDocWithID(pkg, oid)
	if err != nil {
		return models.Package{}, false, err
	}
	if _, err := r.collection.InsertOne(ctx, doc); err != nil {
		if pkg.ClientID != "" && mongo.IsDuplicateKeyError(err) {
			var existing models.Package
			findErr := r.collection.FindOne(ctx, bson.M{"trainee_id": pkg.TraineeID, "client_id": pkg.ClientID}).Decode(&existing)
			return existing, false, findErr
		}
		return models.Package{}, false, err
	}
	pkg.ID = oid.Hex()
	return pkg, true, nil
}

// FindByID returns mongo.ErrNoDocuments for unknown or malformed ids.
func (r *PackageRepository) FindByID(id string) (models.Package, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var pkg models.Package
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return pkg, mongo.ErrNoDocuments
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": oid}).Decode(&pkg)
	return pkg, err
}

// ListByTrainee returns the packages of one client, oldest start first (the order in which
// sessions are used up).
func (r *PackageRepository) ListByTrainee(traineeID string) ([]models.Package, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	opts := options.Find().
		SetSort(bson.D{{Key: "start_date", Value: 1}, {Key: "created_at", Value: 1}}).
		SetLimit(maxPackagesPerClient)
	cursor, err := r.collection.Find(ctx, bson.M{"trainee_id": traineeID}, opts)
	if err != nil {
		return nil, err
	}
	pkgs := []models.Package{}
	if err := cursor.All(ctx, &pkgs); err != nil {
		return nil, err
	}
	return pkgs, nil
}

// Delete removes one package. found=false means no package has that id.
func (r *PackageRepository) Delete(id string) (found bool, err error) {
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

// DeleteByTrainees deletes all packages of the given trainees.
func (r *PackageRepository) DeleteByTrainees(traineeIDs []string) error {
	return deleteByTrainees(r.collection, traineeIDs)
}

// TotalsByTrainees returns the summed package amount (paise) per trainee in one query.
func (r *PackageRepository) TotalsByTrainees(traineeIDs []string) (map[string]int64, error) {
	return sumAmountByTrainee(r.collection, traineeIDs)
}

// sumAmountByTrainee groups amount_paise per trainee for the given trainees (one aggregation,
// no per-trainee round trips). Shared by packages and payments.
func sumAmountByTrainee(coll *mongo.Collection, traineeIDs []string) (map[string]int64, error) {
	out := make(map[string]int64, len(traineeIDs))
	if len(traineeIDs) == 0 {
		return out, nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"trainee_id": bson.M{"$in": traineeIDs}}}},
		{{Key: "$group", Value: bson.M{"_id": "$trainee_id", "total": bson.M{"$sum": "$amount_paise"}}}},
	}
	cursor, err := coll.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	var rows []struct {
		ID    string `bson:"_id"`
		Total int64  `bson:"total"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, err
	}
	for _, row := range rows {
		out[row.ID] = row.Total
	}
	return out, nil
}

// deleteByTrainees removes every document of the given trainees from a collection.
func deleteByTrainees(coll *mongo.Collection, traineeIDs []string) error {
	if len(traineeIDs) == 0 {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_, err := coll.DeleteMany(ctx, bson.M{"trainee_id": bson.M{"$in": traineeIDs}})
	return err
}
