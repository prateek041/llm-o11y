# BUILD STAGE.
FROM golang:1.23 AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY main.go .
RUN CGO_ENABLED=0 go build -o /go-chat-cli .

# FINAL Stage.
FROM scratch
COPY --from=builder /go-chat-cli /go-chat-cli
ENTRYPOINT ["/go-chat-cli"]
