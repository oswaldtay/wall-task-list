
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
  serverTimestamp,
  updateDoc,
  writeBatch,
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
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ChecklistIcon from "@mui/icons-material/Checklist";

const MAX_TASKS = 14;
const MAX_TITLE = 40;
const MAX_NOTES = 60;

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
  const [now, setNow] = useState(() => new Date());
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;

    return onSnapshot(
      collection(db, "tasks"),
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));
        setTasks(list.sort((a, b) => effectiveOrder(a) - effectiveOrder(b)));
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
      notes: String(form.get("notes")).trim(),
    };

    if (!task.title) return;
    if (!editing?.id && tasks.length >= MAX_TASKS) {
      setError(`You can have at most ${MAX_TASKS} tasks.`);
      return;
    }

    try {
      if (editing?.id) {
        await updateDoc(doc(db, "tasks", editing.id), task);
      } else {
        await addDoc(collection(db, "tasks"), {
          ...task,
          order: tasks.length ? Math.max(...tasks.map(effectiveOrder)) + 1 : 0,
          createdAt: serverTimestamp(),
        });
      }
      setEditing(null);
      setError("");
    } catch (err) {
      setError(`Could not save task: ${err.message}`);
    }
  }

  async function dropTask(targetId) {
    const from = tasks.findIndex((t) => t.id === dragId);
    const to = tasks.findIndex((t) => t.id === targetId);
    setDragId(null);
    setOverId(null);
    if (from < 0 || to < 0 || from === to) return;

    const next = [...tasks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTasks(next.map((t, i) => ({ ...t, order: i })));

    try {
      const batch = writeBatch(db);
      next.forEach((t, i) => batch.update(doc(db, "tasks", t.id), { order: i }));
      await batch.commit();
    } catch (err) {
      setError(`Could not reorder tasks: ${err.message}`);
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
  const titleSize = `min(8rem, calc((100vw - 170px) / ${MAX_TITLE * 0.6}), calc((100vh - ${big ? 190 : 130}px) / ${Math.max(tasks.length, 1)} * 0.56))`;
  const notesSize = `min(calc(${titleSize} * 0.6), calc((100vw - 170px) / ${MAX_NOTES * 0.6}))`;

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "rgba(255,255,255,.85)", backdropFilter: "blur(8px)" }}>
        <Toolbar sx={{ py: big ? 2 : 0, justifyContent: "center", position: "relative" }}>
          <Typography
            component="time"
            fontWeight={900}
            color="primary"
            sx={{ whiteSpace: "nowrap", textAlign: "center", lineHeight: 1.1, fontSize: big ? "clamp(2.5rem, 4.5vw, 5rem)" : "clamp(2rem, 3.5vw, 4rem)" }}
          >
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </Typography>
          {!displayMode && (
            <Button startIcon={<LogoutIcon />} color="inherit" size="small" onClick={() => signOut(auth)} sx={{ position: "absolute", right: 8, fontSize: "0.7rem", minWidth: 0, px: 1, py: 0.25 }}>
              Sign out
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", py: 0.5, px: { xs: 2, md: 4 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={0.5} sx={{ flex: 1, minHeight: 0 }}>
          {tasks.map((task) => (
            <Card
              key={task.id}
              draggable={!displayMode}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                setDragId(task.id);
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverId(task.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dropTask(task.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              sx={{
                flex: "1 1 0",
                minHeight: 0,
                display: "flex",
                opacity: dragId === task.id ? 0.4 : 1,
                outline: overId === task.id && dragId !== task.id ? "3px solid" : "none",
                outlineColor: "primary.main",
                ...(!displayMode && { "&:hover": { boxShadow: 6 } }),
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", width: "100%", minHeight: 0 }}>
                {!displayMode && (
                  <DragIndicatorIcon sx={{ ml: 1, fontSize: "min(40px, 4vh)", color: "text.secondary", cursor: "grab", flexShrink: 0 }} />
                )}
                <CardActionArea
                  disabled={displayMode}
                  onClick={() => setEditing(task)}
                  sx={{ flexGrow: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start", "&.Mui-disabled": { opacity: 1 } }}
                >
                  <CardContent sx={{ px: 1.5, py: 0, "&:last-child": { pb: 0 }, width: "100%", minWidth: 0, overflow: "hidden" }}>
                    <Stack direction="row" alignItems="center" spacing={4}>
                      <Typography
                        fontWeight={900}
                        sx={{ fontSize: titleSize, lineHeight: 1.1, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {task.title}
                      </Typography>
                    </Stack>
                    {task.notes && (
                      <Typography
                        color="text.secondary"
                        sx={{ fontSize: notesSize, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
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
          disabled={tasks.length >= MAX_TASKS}
          onClick={() => setEditing({ title: "", notes: "" })}
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
                helperText={`Up to ${MAX_TITLE} characters`}
                slotProps={{ htmlInput: { maxLength: MAX_TITLE } }}
              />
              <TextField
                name="notes"
                label="Notes"
                defaultValue={editing?.notes}
                helperText={`Up to ${MAX_NOTES} characters, single line`}
                fullWidth
                slotProps={{ htmlInput: { maxLength: MAX_NOTES } }}
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

function effectiveOrder(task) {
  if (typeof task.order === "number") return task.order;
  return 1e12 + (task.createdAt?.toMillis?.() ?? 0);
}
