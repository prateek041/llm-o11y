package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/pterm/pterm"
	"github.com/pterm/pterm/putils"
)

var chatServerURL = os.Getenv("CHAT_SERVER_URL")

var currentThreadId string

type SSEChunk struct {
	Type     string `json:"type"`
	Content  string `json:"content"`
	ThreadId string `json:"threadid"`
}

func main() {

	if chatServerURL == "" {
		chatServerURL = "http://localhost:9090/chat"
	}
	// Clear screen by printing empty lines
	for i := 0; i < 50; i++ {
		fmt.Println()
	}

	// Create a beautiful ASCII art header
	pterm.DefaultBigText.WithLetters(
		putils.LettersFromString("AI"),
		putils.LettersFromString(" CHAT"),
	).Render()

	// Display a beautiful header box
	pterm.DefaultBox.WithTitle("Infrastructure AI Chat").WithTitleTopCenter().WithBoxStyle(pterm.NewStyle(pterm.FgCyan)).Println(
		pterm.LightCyan("Welcome to your Infrastructure AI Assistant!\n") +
			pterm.Gray("Ask questions about your infrastructure, deployments, and more."))

	pterm.Println()

	// Display styled instructions
	pterm.DefaultBulletList.WithItems([]pterm.BulletListItem{
		{Level: 0, Text: pterm.LightGreen("Type your message and press Enter to chat")},
		{Level: 0, Text: pterm.LightRed("Type 'exit' to quit the application")},
		{Level: 0, Text: pterm.LightBlue("Your conversation is maintained across messages")},
	}).Render()

	pterm.Println()

	// Create a reader for input
	reader := bufio.NewReader(os.Stdin)

	// Start an infinite loop to keep the chat session going
	for {
		// Create a styled prompt without interactive input
		fmt.Print(pterm.LightCyan("You: "))

		// Read user input
		userInput, err := reader.ReadString('\n')
		if err != nil {
			pterm.Error.WithShowLineNumber(false).Printf("Error reading input: %v\n", err)
			continue
		}

		userInput = strings.TrimSpace(userInput)

		if userInput == "exit" {
			// Render an exit message.
			pterm.DefaultBox.WithTitle("Goodbye!").WithTitleTopCenter().WithBoxStyle(pterm.NewStyle(pterm.FgGreen)).Println(
				pterm.LightGreen("Thanks for using Infrastructure AI Chat!\nHave a great day! 👋"))
			break
		}

		// If the user input is empty, skip processing.
		if userInput == "" {
			continue
		}

		// Show a subtle loading indicator
		pterm.Info.WithShowLineNumber(false).Println("Processing your request...")

		// Call the function to handle the streaming chat
		streamErr := streamChatResponse(userInput)
		if streamErr != nil {
			pterm.Error.WithShowLineNumber(false).Printf("Failed to get response: %v\n", streamErr)
		}

		// Add a separator between conversations
		pterm.Println(pterm.Gray("────────────────────────────────────────"))
		pterm.Println()
	}
}

func streamChatResponse(message string) error {
	requestData := map[string]string{
		"content": message,
	}

	// The currentThreadId is empty for the first message, and is set in-memory for subsequent messages.
	if currentThreadId != "" {
		requestData["threadId"] = currentThreadId
	}

	requestBody, err := json.Marshal(requestData)
	if err != nil {
		return fmt.Errorf("could not marshal request body: %w", err)
	}

	// Create the HTTP request
	req, err := http.NewRequest("POST", chatServerURL, bytes.NewBuffer(requestBody))
	if err != nil {
		return fmt.Errorf("could not create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream") // Set the Accept header to receive SSE (Server-Sent Events)

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request to chat server failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned non-200 status code: %s", resp.Status)
	}

	// Process the stream
	scanner := bufio.NewScanner(resp.Body)

	// Render the AI response.
	aiPrefix := pterm.NewStyle(pterm.FgGreen, pterm.Bold).Sprint("AI")
	fmt.Printf("%s: ", aiPrefix)

	for scanner.Scan() {
		line := scanner.Text()

		if line == "" {
			continue
		}

		// A single line from the server might contain multiple events.
		// We split the line by the "data: " delimiter. This will separate all potential JSON payloads.
		parts := strings.Split(line, "data: ")

		for _, part := range parts {
			// A valid JSON payload will start with '{'. We ignore any other parts
			// The current implementation of the server also sends "function calling" events, but we are not processing them for now.
			if !strings.HasPrefix(part, "{") {
				continue
			}

			// The Go JSON decoder is smart enough to stop parsing when it finds a
			// complete object, so it can handle `{"key":"value"}event:{...}` correctly.
			var chunk SSEChunk
			if err := json.Unmarshal([]byte(part), &chunk); err == nil {
				// Only print the content if the type is "content".
				if chunk.Type == "content" {
					// Use pterm to style the streaming content
					styledContent := pterm.NewStyle(pterm.FgWhite).Sprint(chunk.Content)
					fmt.Print(styledContent)
				}
				// The final event being sent from the backend is "done", and contains the thread ID, we use that thread ID for subsequent messages, to carry
				// over the context from this conversation to the next one.
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
