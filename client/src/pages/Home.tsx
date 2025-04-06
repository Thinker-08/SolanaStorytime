import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";
import ChatHistory from "@/components/ChatHistory";
import MessageInput from "@/components/MessageInput";
import SamplePrompts from "@/components/SamplePrompts";
import { jwtDecode } from "jwt-decode";
import TaskPane from "@/components/TaskPane";
import { useRef } from "react";
import { useSession } from "@/context/SessionContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type TokenPayload = {
  id: number;
  email: string;
  exp: number;
  username: string;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const splitTextIntoChunks = (text: string): string[] => {
  const maxChunkLength = 200;
  const chunks: string[] = [];

  // Clean up text by removing markdown
  const cleanedText = text
    .replace(/\*\*/g, "")
    .replace(/\n---\n/g, " ")
    .replace(/#{1,6}\s/g, "");

  // Split by sentences
  const sentences = cleanedText.split(/(?<=[.!?])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkLength) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  console.log(`Split text into ${chunks.length} chunks for speech`);
  return chunks;
};

export default function Home() {
  const { sessionId, setSessionId } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [isLibraryDialogOpen, setIsLibraryDialogOpen] = useState(false);
  const [isTaskPaneOpen, setIsTaskPaneOpen] = useState(false);
  const [items, setItems] = useState<
    { id: string; title: string; description: string }[]
  >([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [audioElement] = useState<HTMLAudioElement>(new Audio());
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);

  // --- Session Parameters Dialog State ---
  const [sessionParams, setSessionParams] = useState<{
    storyType: string;
  } | null>(null);
  const [isSessionParamsDialogOpen, setIsSessionParamsDialogOpen] =
    useState(false);
  const [storyType, setStoryType] = useState("");

  const { toast } = useToast();
  const taskPaneRef = useRef<HTMLDivElement>(null);

  const validateToken = () => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      console.log("No token found. Redirecting to login.");
      window.location.href = "/";
      return false;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      // Check if token has required fields and is not expired
      if (!decoded.id || !decoded.email || !decoded.exp) {
        console.log("Invalid token format. Redirecting to login.");
        window.location.href = "/";
        return false;
      }

      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      if (decoded.exp < currentTime) {
        localStorage.removeItem("authToken");
        window.location.href = "/";
        return false;
      }
      setUserName(decoded.username);
      return true;
    } catch (error) {
      localStorage.removeItem("authToken");
      window.location.href = "/";
      return false;
    }
  };

  // Initialize session and get welcome message
  useEffect(() => {
    if (!validateToken()) return;
    const storedSessionId = localStorage.getItem("sessionId");
    const token = localStorage.getItem("authToken");

    const newSessionId = storedSessionId || uuidv4();

    if (!storedSessionId) {
      localStorage.setItem("sessionId", newSessionId);
    }
    setItems(data);
    setToken(token);
    setSessionId(newSessionId);
  }, []);

  useEffect(() => {
    const fetchLibraryItems = async () => {
      try {
        const response = await apiRequest(
          "GET",
          "/api/library-stories",
          undefined,
          {
            Authorization: `Bearer ${token}`,
          }
        );
        if (!response.ok) throw new Error("Failed to fetch chat history");
        const data = await response.json();
        setItems(data.stories);
      } catch (err) {
        console.error("Error fetching library items:", err);
      }
    };

    if (token) {
      fetchLibraryItems();
    }
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        taskPaneRef.current &&
        !taskPaneRef.current.contains(event.target as Node)
      ) {
        setIsTaskPaneOpen(false);
      }
    };

    if (isTaskPaneOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTaskPaneOpen]);

  useEffect(() => {
    // Only run when token and sessionId are available.
    if (!token || !sessionId) return;

    // If sessionParams is already set in state, don't open the dialog.
    if (sessionParams !== null) return;

    // Check localStorage for saved session parameters.
    const storedParams = localStorage.getItem("sessionParams");
    if (storedParams) {
      setSessionParams(JSON.parse(storedParams));
      setIsSessionParamsDialogOpen(false);
    } else {
      setIsSessionParamsDialogOpen(true);
    }
  }, [token, sessionId, sessionParams]);

  const { data, isLoading: isLoadingSession } = useQuery({
    queryKey: [`/api/chat/session/${sessionId}`],
    queryFn: async () => {
      const response = await fetch(`/api/chat/session/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch session data");
      }

      return response.json();
    },
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data && "messages" in data && Array.isArray(data.messages)) {
      setMessages(data.messages);
    }
  }, [data]);

  const storyMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest(
        "POST",
        "/api/chat/generate",
        {
          message: message,
          sessionId,
        },
        {
          Authorization: `Bearer ${token}`,
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: data.message,
        },
      ]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to generate story: ${error.message}`,
        variant: "destructive",
      });
    },
  });

useEffect(() => {
  if (sessionParams && sessionParams.storyType) {
    handleSendMessage(storyType, true);
  }
}, [sessionParams]);

  const handleSendMessage = async (message: string, defaultStory = false) => {
    if (!message.trim()) return;

    // Add user message to chat
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: "user",
        content: message,
      },
    ]);

    // Generate story response
    if (defaultStory) {
      message = `Generate a story with a solana concept and a ${storyType} theme.`;
    }
    storyMutation.mutate(message);
  };

  const handleSamplePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUserName("");
    setSessionId("");
    setSessionParams(null);
    localStorage.removeItem("sessionParams");
    localStorage.removeItem("sessionId");
    window.location.href = "/";
  };

  const speakTextChunks = (
    chunks: string[],
    index = 0,
    messageIndex: number
  ) => {
    if (index >= chunks.length || speakingIndex !== messageIndex) {
      if (index >= chunks.length) {
        console.log("Finished speaking all chunks");
        setSpeakingIndex(null);
      }
      return;
    }

    const chunk = chunks[index];
    const utterance = new SpeechSynthesisUtterance(chunk);

    // Set voice properties
    utterance.volume = 1.0;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;

    // Find a good voice
    const voices =
      availableVoices.length > 0
        ? availableVoices
        : window.speechSynthesis.getVoices();

    // Try to find an English female voice first
    const bestVoice =
      voices.find(
        (voice) =>
          voice.lang === "en-US" &&
          (voice.name.includes("female") || voice.name.includes("Female"))
      ) || voices.find((voice) => voice.lang.startsWith("en"));

    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    // When chunk completes, speak the next one
    utterance.onend = () => {
      console.log(`Chunk ${index + 1}/${chunks.length} complete`);
      // Add a small delay between chunks for more natural pauses
      setTimeout(() => {
        speakTextChunks(chunks, index + 1, messageIndex);
      }, 300);
    };

    // Handle errors
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      // Try next chunk despite error
      setTimeout(() => {
        speakTextChunks(chunks, index + 1, messageIndex);
      }, 500);
    };

    console.log(`Speaking chunk ${index + 1}/${chunks.length}`);
    window.speechSynthesis.speak(utterance);
  };

  const speak = (text: string, index: number) => {
    console.log("Text-to-speech requested");

    // If already speaking this message, stop it
    if (speakingIndex === index) {
      console.log("Stopping speech");
      window.speechSynthesis?.cancel(); // Stop browser speech if any
      audioElement.pause(); // Stop audio playback if any
      audioElement.currentTime = 0;
      setSpeakingIndex(null);
      return;
    }

    try {
      // Clean up the text
      const cleanedText = text
        .replace(/\*\*/g, "")
        .replace(/\n---\n/g, " ")
        .replace(/#{1,6}\s/g, "");

      // Set speaking state for UI feedback
      setSpeakingIndex(index);

      // Show toast notification
      toast({
        title: "Story narration starting",
        description:
          "The story will be read aloud now. Click 'Stop' to end narration.",
      });

      // Add audio element event listeners
      const setupAudioElement = () => {
        // Remove any existing listeners to prevent duplicates
        audioElement.onended = null;
        audioElement.onerror = null;

        // Add new listeners
        audioElement.onended = () => {
          console.log("Audio playback ended");
          setSpeakingIndex(null);
        };

        audioElement.onerror = (e) => {
          console.error("Audio element error:", e);
          setSpeakingIndex(null);

          // Try browser fallback if audio fails
          tryBrowserSpeechSynthesis(cleanedText);
        };
      };

      // Function to try browser-based speech synthesis
      const tryBrowserSpeechSynthesis = (text: string) => {
        console.log("Trying browser speech synthesis as fallback");

        if (!window.speechSynthesis) {
          console.error("Browser doesn't support speech synthesis");
          setSpeakingIndex(null);
          return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        try {
          // Try client-side speech synthesis as fallback
          fetch("/api/text-to-speech/speak?fallback=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleanedText }),
          })
            .then((response) => response.json())
            .then((data) => {
              const textToSpeak = data.text || cleanedText;

              // For long text, split into chunks
              if (textToSpeak.length > 200) {
                const chunks = splitTextIntoChunks(textToSpeak);
                speakTextChunks(chunks, 0, index);
              } else {
                // For short text, speak directly
                const utterance = new SpeechSynthesisUtterance(textToSpeak);

                // Apply speech settings
                utterance.rate = 0.9;
                utterance.pitch = 1.1;
                utterance.volume = 1.0;

                // Find a good voice
                const voices =
                  availableVoices.length > 0
                    ? availableVoices
                    : window.speechSynthesis.getVoices();

                const bestVoice =
                  voices.find(
                    (voice) =>
                      voice.lang === "en-US" &&
                      (voice.name.includes("female") ||
                        voice.name.includes("Female"))
                  ) || voices.find((voice) => voice.lang.startsWith("en"));

                if (bestVoice) {
                  utterance.voice = bestVoice;
                }

                // Set up completion handler
                utterance.onend = () => {
                  console.log("Speech completed");
                  setSpeakingIndex(null);
                };

                utterance.onerror = (event) => {
                  console.error("Speech synthesis error:", event);
                  setSpeakingIndex(null);
                };

                // Start speaking
                window.speechSynthesis.speak(utterance);
              }
            });
        } catch (speechError) {
          console.error("Browser speech synthesis failed:", speechError);
          setSpeakingIndex(null);

          toast({
            title: "Speech error",
            description:
              "There was an error starting the narration. Please try again.",
            variant: "destructive",
          });
        }
      };

      // Set up audio element
      setupAudioElement();

      // Try to unlock audio playback on mobile
      const unlockAudio = () => {
        audioElement.src =
          "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
        audioElement
          .play()
          .catch((e) => console.warn("Audio unlock failed:", e));
      };
      unlockAudio();

      // Create an audio element for each request to avoid caching issues
      audioElement.src = `/api/text-to-speech/speak?t=${Date.now()}`;
      audioElement.crossOrigin = "anonymous"; // May help with CORS issues

      // First try direct audio playback from server
      console.log("Trying to play server-generated audio");

      // Start playing
      fetch("/api/text-to-speech/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "audio/wav" },
        body: JSON.stringify({ text: cleanedText }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Server response error: ${response.status}`);
          }

          // Check content type to determine if we got audio or JSON
          const contentType = response.headers.get("content-type");

          if (contentType && contentType.includes("audio")) {
            // We got audio data
            return response.blob();
          } else {
            // We got JSON (fallback)
            return response.json().then((data) => {
              // Use browser speech synthesis
              tryBrowserSpeechSynthesis(data.text || cleanedText);
              throw new Error("Server returned JSON instead of audio");
            });
          }
        })
        .then((audioBlob) => {
          if (!audioBlob) {
            throw new Error("No audio received from server");
          }

          console.log(
            `Received audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`
          );

          // Create URL from blob
          const audioUrl = URL.createObjectURL(
            new Blob([audioBlob], { type: "audio/wav" })
          );

          // Set up the audio element
          audioElement.src = audioUrl;

          // When audio ends, clean up URL
          const originalOnEnded = audioElement.onended;
          audioElement.onended = (e) => {
            URL.revokeObjectURL(audioUrl);
            if (originalOnEnded) originalOnEnded.call(audioElement, e);
          };

          // Play the audio
          console.log("Playing audio from server");
          return audioElement.play();
        })
        .catch((error) => {
          console.error("Error with server-side text-to-speech:", error);
          tryBrowserSpeechSynthesis(cleanedText);
        });
    } catch (error) {
      console.error("Error initializing speech:", error);
      setSpeakingIndex(null);

      toast({
        title: "Speech error",
        description:
          "There was an error starting the narration. Please try again.",
        variant: "destructive",
      });
    }
  };
  return (
    <div className="min-h-screen flex flex-row bg-background">
      {/* Task Pane */}
      <div
        ref={taskPaneRef}
        className={`transition-all duration-300 ease-in-out overflow-hidden h-full
    ${isTaskPaneOpen ? "w-56 sm:w-64 md:w-72 lg:w-80" : "w-0"}`}
      >
        {isTaskPaneOpen && (
          <div className="h-full border-r border-muted-foreground bg-muted">
            <TaskPane {...{ token }} onClose={() => setIsTaskPaneOpen(false)} />
          </div>
        )}
      </div>

      <div className="flex flex-col px-4 md:px-8 lg:px-12 flex-1">
        {/* Header */}
        <header className="mb-6 text-center relative">
          {/* Library Icon Button */}
          <div className="absolute top-0 left-0 p-2">
            {!isTaskPaneOpen && (
              <button
                onClick={() => setIsTaskPaneOpen(true)}
                aria-label="Open Task Pane"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 cursor-pointer"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="w-full flex justify-end items-center gap-3 px-4 py-2">
            {/* Library Icon */}
            <button
              onClick={() => setIsLibraryDialogOpen(true)}
              aria-label="Open Library"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 cursor-pointer"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                />
              </svg>
            </button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm cursor-pointer shadow"
                  title={userName}
                >
                  {getInitials(userName)}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => console.log("Profile clicked")}
                >
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => console.log("Settings clicked")}
                >
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLogout()}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center justify-center mb-2">
            <svg
              className="w-12 h-12 mr-3 text-primary drop-shadow-xl"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent">
              SolanaStories
            </h1>
          </div>
          <p className="text-md text-muted-foreground">
            Magical blockchain stories for curious minds
          </p>
        </header>

        {/* Sample Prompts */}
        <SamplePrompts onPromptClick={handleSamplePromptClick} />

        {/* Chat History */}
        <ChatHistory messages={messages} isLoading={storyMutation.isPending} />

        {/* Message Input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          isDisabled={storyMutation.isPending}
        />

        {/* Footer */}
        <footer className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} SolanaStories • Educational stories
            about blockchain for children
          </p>
        </footer>

        {/* Library Dialog */}
        {isLibraryDialogOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-background p-6 rounded-xl shadow-xl w-[90%] max-w-md border border-muted-foreground transition-all animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-foreground">
                  📚 Library
                </h2>
                <button
                  onClick={() => setIsLibraryDialogOpen(false)}
                  className="text-muted-foreground hover:text-primary"
                  aria-label="Close Library"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {selectedItemId && (
                <div className="mb-4 max-h-60 overflow-y-auto pr-2">
                  <div className="flex justify-between items-center mb-2">
                    <button
                      className="text-sm text-primary underline mb-2"
                      onClick={() => setSelectedItemId(null)}
                    >
                      ← Back to list
                    </button>
                    <Button
                      onClick={() => {
                        const foundItem = items.find(
                          (item) => item.id === selectedItemId
                        );
                        if (foundItem) {
                          const itemIndex = items.indexOf(foundItem);
                          speak(foundItem.description, itemIndex);
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className={`h-8 px-3 py-1 rounded-md ${
                        // Compute the index for the current selected item and compare it with speakingIndex
                        speakingIndex ===
                        items.findIndex((item) => item.id === selectedItemId)
                          ? "speaking-active"
                          : "bg-primary text-white hover:bg-opacity-90"
                      } border-none shadow-md`}
                    >
                      {speakingIndex ===
                      items.findIndex((item) => item.id === selectedItemId) ? (
                        <div className="flex items-center">
                          <VolumeX className="h-4 w-4 mr-1" />
                          <span>Stop</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Volume2 className="h-4 w-4 mr-1" />
                          <span>Listen</span>
                        </div>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {
                      items?.find((item) => item.id === selectedItemId)
                        ?.description
                    }
                  </p>
                </div>
              )}

              {!selectedItemId && (
                <ul className="space-y-2 max-h-64 overflow-auto">
                  {items?.map((item) => (
                    <li
                      key={item.id}
                      className="cursor-pointer bg-accent hover:bg-accent/80 px-4 py-2 rounded-lg transition"
                      onClick={() => setSelectedItemId(item.id)}
                    >
                      {item.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {isSessionParamsDialogOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="relative bg-background p-4 rounded shadow-lg w-80">
              {/* Close Button */}
              <button
                onClick={() => setIsSessionParamsDialogOpen(false)}
                aria-label="Close"
                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-primary"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <h2 className="text-xl font-bold mb-4">Set Session Parameters</h2>

              <label className="block text-sm text-muted-foreground mb-1">
                Select Story Type
              </label>
              <select
                className="border p-2 w-full mb-4 text-primary bg-background rounded"
                value={storyType}
                onChange={(e) => setStoryType(e.target.value)}
              >
                <option value="">-- Choose a Story --</option>
                <option value="Frozen">Frozen</option>
                <option value="Encanto">Encanto</option>
                <option value="Minions / Despicable Me">
                  Minions / Despicable Me
                </option>
                <option value="Spider-Man / Marvel Superheroes">
                  Spider-Man / Marvel Superheroes
                </option>
                <option value="Paw Patrol">Paw Patrol</option>
                <option value="Toy Story">Toy Story</option>
                <option value="Moana">Moana</option>
                <option value="The Little Mermaid">The Little Mermaid</option>
                <option value="Peppa Pig">Peppa Pig</option>
                <option value="Barbie">Barbie</option>
              </select>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    const params = { storyType };
                    setSessionParams(params);
                    localStorage.setItem(
                      "sessionParams",
                      JSON.stringify(params)
                    );
                    setIsSessionParamsDialogOpen(false);
                  }}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
