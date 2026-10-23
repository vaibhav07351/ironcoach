package repositories

import "testing"

func TestCloudinaryPublicID(t *testing.T) {
	cases := []struct {
		url    string
		wantID string
		wantOK bool
	}{
		{"https://res.cloudinary.com/demo/image/upload/v1712345/ironcoach/abc.jpg", "ironcoach/abc", true},
		{"https://res.cloudinary.com/demo/image/upload/c_limit,w_1080,h_1080/v1712345/ironcoach/abc.jpg", "ironcoach/abc", true},
		{"https://res.cloudinary.com/demo/image/upload/abc.png", "abc", true},
		{"https://res.cloudinary.com/other-cloud/image/upload/v1/ironcoach/abc.jpg", "", false},
		{"https://lh3.googleusercontent.com/a/photo.jpg", "", false},
		{"not a url", "", false},
	}
	for _, tc := range cases {
		id, ok := cloudinaryPublicID(tc.url, "demo")
		if id != tc.wantID || ok != tc.wantOK {
			t.Errorf("cloudinaryPublicID(%q) = (%q, %v), want (%q, %v)", tc.url, id, ok, tc.wantID, tc.wantOK)
		}
	}
}
