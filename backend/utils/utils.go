package utils

import (
	"errors"
	"os"
	"sync"
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

var (
	jwtKeyOnce sync.Once
	jwtKey     []byte
)

func getJWTKey() []byte {
	jwtKeyOnce.Do(func() {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			panic("JWT_SECRET is not set")
		}
		jwtKey = []byte(secret)
	})
	return jwtKey
}

// Claims is the JWT payload for authenticated users.
type Claims struct {
	Email     string `json:"email"`
	UserID    string `json:"user_id,omitempty"`
	Role      string `json:"role,omitempty"` // trainer | client
	TrainerID string `json:"trainer_id,omitempty"`
	TraineeID string `json:"trainee_id,omitempty"`
	jwt.RegisteredClaims
}

// GenerateJWT creates a signed token for a given email (legacy trainer login).
func GenerateJWT(email string) (string, error) {
	return GenerateAuthJWT(Claims{
		Email: email,
		Role:  "trainer",
	})
}

// GenerateAuthJWT creates a signed token with full auth claims.
func GenerateAuthJWT(claims Claims) (string, error) {
	expirationTime := time.Now().Add(7 * 24 * time.Hour)
	claims.RegisteredClaims = jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(expirationTime),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, &claims)
	return token.SignedString(getJWTKey())
}

// VerifyJWT validates a token and extracts the claims.
func VerifyJWT(tokenString string) (*Claims, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return getJWTKey(), nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}

	return claims, nil
}
