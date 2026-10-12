import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { Alert, Box, Card, Stack, Typography } from "@mui/material";
import { DEFAULT_COLOR, contrastText, formatTime } from "./time";
import { MAX_NOTES, MAX_TASKS, MAX_TITLE } from "./constants";

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return onSnapshot(
      doc(db, "config", "live"),
      (snap) => {
        setTasks(snap.data()?.tasks ?? []);
        setColor(snap.data()?.color ?? DEFAULT_COLOR);
      },
      (err) => setError(err.message)
    );
  }, []);

  const titleSize = `min(10rem, calc((100vw - 100px) * 0.75 / ${MAX_TITLE * 0.5}), calc((100vh - 190px) / ${MAX_TASKS} * 0.6))`;
  const notesSize = `min(calc(${titleSize} * 0.7), calc((100vw - 100px) * 0.75 / ${MAX_NOTES * 0.5}))`;

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Box sx={{ py: 2, textAlign: "center", borderBottom: 4, borderColor: `color-mix(in srgb, ${color}, black 30%)`, bgcolor: color }}>
        <Typography
          component="time"
          fontWeight={900}
          sx={{ whiteSpace: "nowrap", lineHeight: 1.1, color: contrastText(color), textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "clamp(2.5rem, 4.5vw, 5rem)", WebkitTextStroke: "2px currentColor" }}
        >
          {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", py: 0.5, px: { xs: 2, md: 4 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack sx={{ flex: 1, minHeight: 0 }}>
          {tasks.map((task) => (
            <Box key={task.id} sx={{ height: `${100 / MAX_TASKS}%`, flexShrink: 0, py: "2px" }}>
            <Card sx={{ height: "100%", display: "flex", alignItems: "stretch" }}>
              <Box
                sx={{
                  flexShrink: 0,
                  width: "25%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: task.time ? color : "action.hover",
                  color: contrastText(color),
                  fontWeight: 900,
                  fontSize: `min(${titleSize}, calc((100vw - 100px) * 0.25 / 5.5))`,
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                }}
              >
                {task.time ? formatTime(task.time) : ""}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, pl: 2, pr: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Typography
                  fontWeight={900}
                  sx={{ fontSize: titleSize, lineHeight: 1.05, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {task.title}
                </Typography>
                {task.notes && (
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: notesSize, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {task.notes}
                  </Typography>
                )}
              </Box>
            </Card>
            </Box>
          ))}
          {tasks.length === 0 && !error && (
            <Typography color="text.secondary" align="center" variant="h4" sx={{ py: 6 }}>
              No tasks yet.
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
