// File: main.go
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

const chatServerURL = "http://localhost:9090/chat"

var currentThreadId string

type SSEChunk struct {
	Type     string `json:"type"`
	Content  string `json:"content"`
	ThreadId string `json:"threadid"`
}

func main() {
	// Create a reader to get input from the user's terminal
	reader := bufio.NewReader(os.Stdin)
	fmt.Println("Chat with your Infrastructure AI. Type 'exit' to quit.")
	fmt.Println("-----------------------------------------------------")

	// Start an infinite loop to keep the chat session going
	for {
		fmt.Print("> ")
		userInput, _ := reader.ReadString('\n')
		userInput = strings.TrimSpace(userInput)

		if userInput == "exit" {
			fmt.Println("Goodbye!")
			break
		}

		if userInput == "" {
			continue
		}

		// Call the function to handle the streaming chat
		err := streamChatResponse(userInput)
		if err != nil {
			log.Printf("ERROR: %v\n", err)
		}
	}
}

func streamChatResponse(message string) error {
	// 1. Prepare the request body
	requestData := map[string]string{
		"content": message,
	}

	if currentThreadId != "" {
		requestData["threadId"] = currentThreadId
	}

	requestBody, err := json.Marshal(requestData)
	if err != nil {
		return fmt.Errorf("could not marshal request body: %w", err)
	}

	// 2. Create the HTTP request
	req, err := http.NewRequest("POST", chatServerURL, bytes.NewBuffer(requestBody))
	if err != nil {
		return fmt.Errorf("could not create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")

	// 3. Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request to chat server failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned non-200 status code: %s", resp.Status)
	}

	// 4. Process the stream
	scanner := bufio.NewScanner(resp.Body)
	fmt.Print("AI: ")

	for scanner.Scan() {
		line := scanner.Text()

		if line == "" {
			continue
		}

		// A single line from the server might contain multiple events.
		// We split the line by the "data: " delimiter. This will separate all potential JSON payloads.
		// Example: "event:{...}data:{json1}data:{json2}" becomes ["event:{...}", "{json1}", "{json2}"]
		parts := strings.Split(line, "data: ")

		// We iterate over the resulting parts.
		for _, part := range parts {
			// A valid JSON payload will start with '{'. We ignore any other parts
			// (like the junk "event:{...}" part at the beginning).
			if !strings.HasPrefix(part, "{") {
				continue
			}

			// The Go JSON decoder is smart enough to stop parsing when it finds a
			// complete object, so it can handle `{"key":"value"}event:{...}` correctly.
			var chunk SSEChunk
			if err := json.Unmarshal([]byte(part), &chunk); err == nil {
				// Only print the content if the type is "content".
				if chunk.Type == "content" {
					fmt.Printf("%s", chunk.Content)
				}
				if chunk.Type == "done" {
					currentThreadId = chunk.ThreadId
				}
			}
		}
	}

	fmt.Println() // Final newline after the stream ends.

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading stream from server: %w", err)
	}

	return nil
}
