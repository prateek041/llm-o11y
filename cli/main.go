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

type SSEChunk struct {
	Type    string `json:"type"`
	Content string `json:"content"`
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
			// Print errors in a noticeable way but don't crash the program
			log.Printf("ERROR: %v\n", err)
		}
	}
}

// streamChatResponse handles the entire process of sending a message
// and processing the streaming SSE response.
func streamChatResponse(message string) error {
	requestBody, err := json.Marshal(map[string]string{"content": message})
	if err != nil {
		return fmt.Errorf("could not marshal request body: %w", err)
	}

	// 2. Create a new HTTP POST request
	req, err := http.NewRequest("POST", chatServerURL, bytes.NewBuffer(requestBody))
	if err != nil {
		return fmt.Errorf("could not create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream") // Crucial for telling the server we want an SSE stream

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

	// 4. Process the streaming response line-by-line
	scanner := bufio.NewScanner(resp.Body)
	fmt.Print("AI: ") // Print the prompt for the AI's response once

	for scanner.Scan() {
		line := scanner.Text()

		// Ignore empty keep-alive lines
		if line == "" {
			continue
		}

		// Check if the line is an SSE data line (it must start with "data: ")
		if strings.HasPrefix(line, "data: ") {
			// Get the JSON part of the line by stripping the prefix
			jsonData := strings.TrimPrefix(line, "data: ")

			var chunk SSEChunk
			// Try to unmarshal the JSON into our struct
			if err := json.Unmarshal([]byte(jsonData), &chunk); err == nil {
				// We only care about printing the "content" type chunks to the user.
				// This filters out other events like "thinking", "done", etc.
				if chunk.Type == "content" {
					fmt.Printf("%s", chunk.Content)
				}
			}
			// If unmarshaling fails, we just ignore that line and continue.
		}
	}

	// This prints a final newline after the AI has finished speaking,
	// so the user's next prompt starts on a fresh line.
	fmt.Println()

	// Check for any errors that might have occurred during scanning (e.g., connection closed unexpectedly)
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading stream from server: %w", err)
	}

	return nil
}
