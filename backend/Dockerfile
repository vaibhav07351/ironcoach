# Build on the host arch (Ampere aarch64 on Oracle Always Free).
FROM golang:1.23-bookworm AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/ironcoach ./cmd/main.go

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /
COPY --from=builder /out/ironcoach /ironcoach

EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/ironcoach"]
