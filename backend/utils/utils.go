package utils

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// HashPassword hashes a plain-text password
func HashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashed), err
}

// CheckPassword compares a hashed password with a plain-text password
func CheckPassword(hashedPassword, plainPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword))
	return err == nil
}

var jwtKey = []byte(os.Getenv("JWT_SECRET"))

//JWT= header.payload.signature
// Claims(Payload) structure for JWT
type Claims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

// GenerateJWT creates a signed token for a given email
func GenerateJWT(email string) (string, error) {
	expirationTime := time.Now().Add(7 *24 * time.Hour)
	claims := &Claims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

// VerifyJWT validates a token and extracts the claims
func VerifyJWT(tokenString string) (*Claims, error) {
    claims := &Claims{}

    token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
        return jwtKey, nil
    })

    if err != nil || !token.Valid {
        return nil, err
    }

    return claims, nil
}