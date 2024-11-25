package models

type Trainer struct {
    Name     string `json:"name" bson:"name"`
    Email    string `json:"email" bson:"email"`
    Password string `json:"password" bson:"password"`
}