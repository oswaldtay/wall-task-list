
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LogoutIcon from "@mui/icons-material/Logout";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ChecklistIcon from "@mui/icons-material/Checklist";

const displayMode = new URLSearchParams(
  window.location.search
).get("display") === "1";

export default function App() {
  const [user, setUser] = useState(undefined);
  const [tasks, setTasks] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tasks"),
      orderBy("time", "asc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        setTasks(snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })));
      },
      (err) => setError(err.message)
    );
  }, [user]);

  async function login(e) {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Sign-in failed. Check your email and password.");
    }
  }

  async function saveTask(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const task = {
      title: String(form.get("title")).trim(),
      time: String(form.get("time")),
      notes: String(form.get("notes")).trim(),
      updatedAt: serverTimestamp(),
    };

    if (!task.title) return;

    try {
      if (editing?.id) {
        await updateDoc(doc(db, "tasks", editing.id), task);
      } else {
        await addDoc(collection(db, "tasks"), {
          ...task,
          createdAt: serverTimestamp(),
        });
      }
      setEditing(null);
      setError("");
    } catch (err) {
      setError(`Could not save task: ${err.message}`);
    }
  }

  async function removeTask(id) {
    if (!window.confirm("Delete this task?")) return;
    try {
      await deleteDoc(doc(db, "tasks", id));
      setEditing(null);
    } catch (err) {
      setError(`Could not delete task: ${err.message}`);
    }
  }

  if (user === undefined) {
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="xs" sx={{ minHeight: "100vh", display: "grid", alignContent: "center" }}>
        <Card sx={{ p: 2 }}>
          <CardContent>
            <Stack alignItems="center" spacing={1} sx={{ mb: 3 }}>
              <ChecklistIcon color="primary" sx={{ fontSize: 48 }} />
              <Typography variant="h4" fontWeight={700}>Task List</Typography>
            </Stack>
            <Stack component="form" spacing={2} onSubmit={login}>
              <TextField
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
              />
              <TextField
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large">Sign in</Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const big = displayMode;

  return (
    <Box sx={{ minHeight: "100vh", pb: displayMode ? 4 : 12 }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "rgba(255,255,255,.85)", backdropFilter: "blur(8px)" }}>
        <Toolbar sx={{ gap: 1.5, py: big ? 2 : 0 }}>
          <ChecklistIcon color="primary" sx={{ fontSize: big ? 48 : 30 }} />
          <Typography variant={big ? "h2" : "h5"} fontWeight={700} sx={{ flexGrow: 1 }}>
            Task List
          </Typography>
          {!displayMode && (
            <Button startIcon={<LogoutIcon />} color="inherit" onClick={() => signOut(auth)}>
              Sign out
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth={big ? "xl" : "md"} sx={{ mt: big ? 5 : 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={big ? 3 : 2}>
          {tasks.map((task) => (
            <Card key={task.id} sx={!displayMode ? { "&:hover": { boxShadow: 6, transform: "translateY(-2px)" } } : undefined}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CardActionArea
                  disabled={displayMode}
                  onClick={() => setEditing(task)}
                  sx={{ flexGrow: 1, "&.Mui-disabled": { opacity: 1 } }}
                >
                  <CardContent sx={{ p: big ? 4 : 2.5 }}>
                    <Typography variant={big ? "h3" : "h6"} fontWeight={700} sx={{ overflowWrap: "anywhere" }}>
                      {task.title}
                    </Typography>
                    {task.time && (
                      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.5, color: "primary.main" }}>
                        <AccessTimeIcon fontSize={big ? "large" : "small"} />
                        <Typography variant={big ? "h5" : "body2"} fontWeight={600}>
                          {formatTime(task.time)}
                        </Typography>
                      </Stack>
                    )}
                    {task.notes && (
                      <Typography
                        variant={big ? "h5" : "body1"}
                        color="text.secondary"
                        sx={{ mt: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                      >
                        {task.notes}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Box>
            </Card>
          ))}
          {tasks.length === 0 && (
            <Typography color="text.secondary" align="center" variant={big ? "h4" : "body1"} sx={{ py: 6 }}>
              No tasks yet.
            </Typography>
          )}
        </Stack>
      </Container>

      {!displayMode && (
        <Fab
          color="primary"
          aria-label="Add task"
          onClick={() => setEditing({ title: "", time: "", notes: "" })}
          sx={{ position: "fixed", right: 24, bottom: 24 }}
        >
          <AddIcon />
        </Fab>
      )}

      {!displayMode && (
        <Dialog
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          fullWidth
          maxWidth="sm"
          slotProps={{ paper: { component: "form", onSubmit: saveTask } }}
        >
          <DialogTitle fontWeight={700}>{editing?.id ? "Edit task" : "New task"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField
                name="title"
                label="Title"
                defaultValue={editing?.title}
                required
                autoFocus
                fullWidth
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              <TextField
                name="time"
                label="Time"
                type="time"
                defaultValue={editing?.time}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                name="notes"
                label="Notes"
                defaultValue={editing?.notes}
                multiline
                minRows={4}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 2000 } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            {editing?.id && (
              <Button color="error" onClick={() => removeTask(editing.id)} sx={{ mr: "auto" }}>
                Delete
              </Button>
            )}
            <Button color="inherit" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" variant="contained">Save task</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

function formatTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}