import {
  AlertCircle,
  CheckCircle,
  Monitor,
  Smartphone,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { ButtonGroup } from "./components/ui/button-group";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "./components/ui/field";
import { Textarea } from "./components/ui/textarea";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "./lib/utils";
import { Alert, AlertDescription } from "./components/ui/alert";
import { useEffect, useRef, useState } from "react";

const videoFormSchema = z.object({
  prompt: z
    .string()
    .min(10, "Prompt must be at least 10 characters")
    .max(500, "Prompt must be under 500 characters"),
  duration: z.enum(["30 sec", "1 min"], {
    message: "Please select a duration",
  }),
  orientation: z.enum(["landscape", "portrait"], {
    message: "Please select an orientation",
  }),
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

const defaultValues: VideoFormValues = {
  prompt: "",
  duration: "30 sec",
  orientation: "landscape",
};

type VideoStatus =
  | "idle"
  | "generating"
  | "polling"
  | "completed"
  | "failed"
  | "error";

function App() {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues,
  });

  const [status, setStatus] = useState<VideoStatus>("idle");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [videoLoaded, setVideoLoaded] = useState(false);

  const pollingIntervalRef = useRef<number | null>(null);

  const orientation = watch("orientation");

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const pollVideoStatus = async (video_id: string) => {
    try {
      const response = await fetch(`/api/video-status?video_id=${video_id}`);
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setErrorMsg(data.error || "Failed to check video status");
        stopPolling();
        return;
      }

      // Update status based on response
      if (data.status === "completed") {
        setStatus("completed");
        setVideoUrl(data.video_url);
        stopPolling();
      } else if (data.status === "failed") {
        setStatus("failed");
        setErrorMsg("Video generation failed. Please try again.");
        stopPolling();
      } else {
        // Still processing (pending, processing, etc.)
        setStatus("polling");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("Network error while checking status. Please try again.");
      stopPolling();
    }
  };

  const startPolling = (video_id: string) => {
    setStatus("polling");

    // Poll immediately first
    pollVideoStatus(video_id);

    // Then poll every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollVideoStatus(video_id);
    }, 5000);
  };

  const onSubmit = async (data: VideoFormValues) => {
    setStatus("generating");
    setVideoUrl("");
    setErrorMsg("");
    setVideoLoaded(false);
    stopPolling(); // Clear any existing polling

    try {
      const response = await fetch(`/api/video-api`, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          duration_sec: data.duration === "1 min" ? 60 : 30,
          prompt: data.prompt,
          orientation: data.orientation,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setStatus("error");
        setErrorMsg(result.error || "Failed to start video generation.");
        return;
      }

      const { video_id } = result.data;
      startPolling(video_id);
    } catch (err) {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  const isLoading = status === "generating" || status === "polling";

  const statusMessage: Record<string, string> = {
    generating: "Sending your request to HeyGen...",
    polling: "Generating your video, this may take a few minutes...",
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto p-4">
      <div className="flex">
        <h1 className="text-xl font-medium">Generate AI Videos</h1>
      </div>

      <Alert className="bg-yellow-500/10">
        <AlertCircle />
        <p>
          This is a personal project by Yash Agrawal (
          <a
            href="https://www.linkedin.com/in/yash-ag-online/"
            className="underline italic"
          >
            LinkedIn
          </a>
          ), created as part of his learning journey in AI engineering. It is
          intended solely for educational and experimental purposes and is not
          meant for commercial use.
          <br />
          <br />
          Yash Agrawal is not responsible for any incorrect, misleading, or
          inappropriate content generated by the AI system. As this project
          involves artificial intelligence, the outputs may contain errors or
          inaccuracies.
        </p>
      </Alert>

      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldSet className="border p-4">
          {/* Prompt */}
          <Field>
            <FieldLabel>Prompt</FieldLabel>
            {errors.prompt && <FieldError>{errors.prompt.message}</FieldError>}
            <Textarea
              placeholder="write your video description here..."
              {...register("prompt")}
            />
          </Field>

          <FieldGroup className="grid sm:grid-cols-2 md:grid-cols-3">
            {/* Duration */}
            <Controller
              name="duration"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Select Duration</FieldLabel>
                  {errors.duration && (
                    <FieldError>{errors.duration.message}</FieldError>
                  )}
                  <ButtonGroup>
                    {(["30 sec", "1 min"] as const).map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant={field.value === d ? "default" : "outline"}
                        onClick={() => field.onChange(d)}
                      >
                        {d}
                      </Button>
                    ))}
                  </ButtonGroup>
                </Field>
              )}
            />

            {/* Orientation */}
            <Controller
              name="orientation"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Select Orientation</FieldLabel>
                  {errors.orientation && (
                    <FieldError>{errors.orientation.message}</FieldError>
                  )}
                  <ButtonGroup>
                    <Button
                      type="button"
                      variant={field.value === "landscape"
                        ? "default"
                        : "outline"}
                      onClick={() => field.onChange("landscape")}
                    >
                      <Monitor className="h-4 w-4" />
                      Landscape
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "portrait"
                        ? "default"
                        : "outline"}
                      onClick={() => field.onChange("portrait")}
                    >
                      <Smartphone className="h-4 w-4" />
                      Portrait
                    </Button>
                  </ButtonGroup>
                </Field>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="mt-auto col-span-full"
            >
              <Sparkles />
              {isLoading ? "Generating…" : "Generate"}
            </Button>
          </FieldGroup>

          {/* Status Alerts - Success */}
          {status === "completed" && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Your video is ready!
              </AlertDescription>
            </Alert>
          )}

          {/* Status Alerts - Error/Failed */}
          {(status === "failed" || status === "error") && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <XCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700 dark:text-red-400">
                {errorMsg}
              </AlertDescription>
            </Alert>
          )}

          {/* Loading status message */}
          {isLoading && (
            <p className="text-sm text-center text-muted-foreground animate-pulse">
              {statusMessage[status]}
            </p>
          )}

          {/* Video preview */}
          <div
            className={cn(
              "border bg-muted flex items-center justify-center text-muted-foreground text-sm transition-all duration-300 overflow-hidden",
              orientation === "landscape"
                ? "w-full aspect-video"
                : "mx-auto aspect-9/16 w-64",
            )}
          >
            {/* Loading spinner */}
            {isLoading && (
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs text-muted-foreground">Please wait...</p>
              </div>
            )}

            {/* Video */}
            {status === "completed" && videoUrl && (
              <>
                {/* show spinner until video is ready to play */}
                {!videoLoaded && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-xs text-muted-foreground">
                      Loading video...
                    </p>
                  </div>
                )}
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  onCanPlay={() => setVideoLoaded(true)}
                  className={cn(
                    "w-full h-full object-cover",
                    !videoLoaded && "hidden",
                  )}
                />
              </>
            )}

            {/* Placeholder */}
            {status === "idle" && (
              <span>
                {orientation === "landscape" ? "16:9 Preview" : "9:16 Preview"}
              </span>
            )}

            {/* Error */}
            {(status === "failed" || status === "error") && (
              <div className="flex flex-col items-center gap-2 p-4 text-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="text-xs text-red-500">{errorMsg}</p>
              </div>
            )}
          </div>
        </FieldSet>
      </form>
    </div>
  );
}

export default App;
