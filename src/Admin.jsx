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
  setDoc,
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
  IconButton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import LogoutIcon from "@mui/icons-material/Logout";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ChecklistIcon from "@mui/icons-material/Checklist";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { DEFAULT_COLOR, formatTime } from "./time";
import { MAX_NOTES, MAX_TASKS, MAX_TITLE } from "./constants";

const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const cleanTasks = (tasks) =>
  tasks.map(({ id, title, time, notes }) => ({ id, title, time: time ?? "", notes: notes ?? "" }));

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [lists, setLists] = useState([]);
  const [liveId, setLiveId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) return;
    const unsubLists = onSnapshot(
      collection(db, "taskLists"),
      (snap) => {
        const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        next.sort((a, b) => (a.createdAt?.toMillis?.() ?? Infinity) - (b.createdAt?.toMillis?.() ?? Infinity));
        setLists(next);
      },
      (err) => setError(err.message)
    );
    const unsubLive = onSnapshot(
      doc(db, "config", "live"),
      (snap) => setLiveId(snap.data()?.listId ?? null),
      (err) => setError(err.message)
    );
    return () => {
      unsubLists();
      unsubLive();
    };
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

  async function createList(e) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    if (!name) return;
    try {
      const ref = await addDoc(collection(db, "taskLists"), {
        name,
        tasks: [],
        createdAt: serverTimestamp(),
      });
      setCreating(false);
      setSelectedId(ref.id);
    } catch (err) {
      setError(`Could not create list: ${err.message}`);
    }
  }

  async function deleteList(list) {
    const warning = list.id === liveId ? " It is currently live; the home page will be emptied." : "";
    if (!window.confirm(`Delete "${list.name}"?${warning}`)) return;
    try {
      if (list.id === liveId) {
        await setDoc(doc(db, "config", "live"), { listId: null, tasks: [] });
      }
      await deleteDoc(doc(db, "taskLists", list.id));
    } catch (err) {
      setError(`Could not delete list: ${err.message}`);
    }
  }

  async function promote(list) {
    try {
      await setDoc(doc(db, "config", "live"), {
        listId: list.id,
        tasks: cleanTasks(list.tasks ?? []),
        color: list.color ?? DEFAULT_COLOR,
      });
      setError("");
    } catch (err) {
      setError(`Could not promote list: ${err.message}`);
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
              <Typography variant="h4" fontWeight={700}>Admin</Typography>
            </Stack>
            <Stack component="form" spacing={2} onSubmit={login}>
              <TextField type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth />
              <TextField type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required fullWidth />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large">Sign in</Button>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const selected = lists.find((l) => l.id === selectedId);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ gap: 0.5, px: { xs: 1.5, sm: 3 } }}>
          <Typography variant="h6" fontWeight={800} color="primary" noWrap sx={{ flexGrow: 1, fontSize: { xs: "1.05rem", sm: "1.25rem" } }}>
            Admin
          </Typography>
          <Button component="a" href="/home" color="inherit" size="small">View home</Button>
          <Button startIcon={<LogoutIcon />} color="inherit" size="small" onClick={() => signOut(auth)}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 }, pb: 12 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}

        {selected ? (
          <ListEditor
            key={selected.id}
            list={selected}
            isLive={selected.id === liveId}
            onBack={() => setSelectedId(null)}
            onError={setError}
          />
        ) : (
          <>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1, fontSize: { xs: "1.2rem", sm: "1.5rem" } }}>Saved task lists</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} sx={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                New task list
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {lists.map((list) => (
                <Card key={list.id} sx={list.id === liveId ? { border: 2, borderColor: "success.main" } : undefined}>
                  {list.id === liveId && (
                    <Box sx={{ bgcolor: "success.main", color: "success.contrastText", textAlign: "center", fontWeight: 700, fontSize: 12, letterSpacing: 1.5, py: 0.25 }}>
                      LIVE
                    </Box>
                  )}
                  <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={{ xs: 0, sm: 1.5 }} sx={{ pr: { sm: 2 }, py: 1 }}>
                    <CardActionArea onClick={() => setSelectedId(list.id)} sx={{ flexGrow: 1, p: 2 }}>
                      <Stack direction="row" alignItems="center" columnGap={1.5}>
                        <Typography variant="h6" fontWeight={700} sx={{ overflowWrap: "anywhere", flexGrow: 1, textAlign: "left" }}>{list.name}</Typography>
                        <Typography color="text.secondary" variant="body2" sx={{ whiteSpace: "nowrap" }}>
                          {(list.tasks ?? []).length} tasks
                        </Typography>
                      </Stack>
                    </CardActionArea>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ px: { xs: 2, sm: 0 }, pb: { xs: 1, sm: 0 } }}>
                    <Button
                      variant="contained"
                      color="success"
                      disableElevation
                      disabled={list.id === liveId}
                      onClick={() => promote(list)}
                      sx={{ whiteSpace: "nowrap", minWidth: 150, textAlign: "center", flexGrow: { xs: 1, sm: 0 } }}
                    >
                      Promote to live
                    </Button>
                    <IconButton color="error" aria-label="Delete task list" onClick={() => deleteList(list)}>
                      <DeleteIcon />
                    </IconButton>
                    </Stack>
                  </Stack>
                </Card>
              ))}
              {lists.length === 0 && (
                <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                  No task lists yet. Create one to get started.
                </Typography>
              )}
            </Stack>
          </>
        )}
      </Container>

      <Dialog
        open={creating}
        onClose={() => setCreating(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { component: "form", onSubmit: createList } }}
      >
        <DialogTitle fontWeight={700}>New task list</DialogTitle>
        <DialogContent>
          <TextField name="name" label="Name" required autoFocus fullWidth sx={{ mt: 1 }} slotProps={{ htmlInput: { maxLength: 60 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setCreating(false)}>Cancel</Button>
          <Button type="submit" variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ListEditor({ list, isLive, onBack, onError }) {
  const [name, setName] = useState(list.name);
  const [tasks, setTasks] = useState(() => cleanTasks(list.tasks ?? []));
  const [color, setColor] = useState(list.color ?? DEFAULT_COLOR);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [renaming, setRenaming] = useState(false);

  function change(next) {
    setTasks(next);
    setDirty(true);
  }

  function move(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= tasks.length) return;
    const next = [...tasks];
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  }

  function renameList(e) {
    e.preventDefault();
    const next = String(new FormData(e.currentTarget).get("name")).trim();
    if (!next) return;
    if (next !== name) {
      setName(next);
      setDirty(true);
    }
    setRenaming(false);
  }

  function saveTask(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title")).trim();
    const time = String(form.get("time") ?? "");
    const notes = String(form.get("notes")).trim();
    if (!title) return;
    if (editing.id) {
      change(tasks.map((t) => (t.id === editing.id ? { ...t, title, time, notes } : t)));
    } else {
      change([...tasks, { id: newId(), title, time, notes }]);
    }
    setEditing(null);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      onError("The list needs a name.");
      return;
    }
    setSaving(true);
    try {
      const saved = cleanTasks(tasks);
      await updateDoc(doc(db, "taskLists", list.id), { name: trimmed, tasks: saved, color });
      if (isLive) await setDoc(doc(db, "config", "live"), { listId: list.id, tasks: saved, color });
      setDirty(false);
      onError("");
    } catch (err) {
      onError(`Could not save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onBack();
  }

  return (
    <>
      <Stack direction="row" alignItems="center" sx={{ mb: 1, gap: 1 }}>
        <IconButton aria-label="Back" onClick={back}><ArrowBackIcon /></IconButton>
        <Button
          color="inherit"
          endIcon={<EditIcon fontSize="small" />}
          onClick={() => setRenaming(true)}
          sx={{ flexGrow: 1, flexBasis: 0, minWidth: 140, justifyContent: "flex-start", textTransform: "none", fontSize: "1.15rem", fontWeight: 700, textAlign: "left", overflowWrap: "anywhere" }}
        >
          {name || "Untitled"}
        </Button>
      </Stack>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, gap: 2.5 }}>
        <Box
          component="label"
          title="Theme color"
          sx={{
            position: "relative",
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: "50%",
            bgcolor: color,
            border: "3px solid #fff",
            boxShadow: 3,
            outline: "1px solid",
            outlineColor: "divider",
            cursor: "pointer",
            transition: "transform .15s, box-shadow .15s",
            "&:hover": { transform: "scale(1.1)", boxShadow: 6 },
            "&:focus-within": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
          }}
        >
          <Box
            component="input"
            type="color"
            aria-label="Theme color"
            value={color}
            onChange={(e) => { setColor(e.target.value); setDirty(true); }}
            sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
          />
        </Box>
        <Button variant="contained" onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {tasks.length} of {MAX_TASKS} tasks
      </Typography>

      <Stack spacing={1}>
        {tasks.map((task, index) => (
          <Card key={task.id}>
            <Stack direction="row" alignItems="center" sx={{ pr: 1 }}>
              <Stack sx={{ ml: 0.5 }}>
                <IconButton size="small" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" aria-label="Move down" disabled={index === tasks.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </Stack>
              <CardActionArea onClick={() => setEditing(task)} sx={{ flexGrow: 1, minWidth: 0, py: 1.5, px: 1, textAlign: "left" }}>
                <Typography fontWeight={700} sx={{ overflowWrap: "anywhere" }}>{task.title}</Typography>
                {task.time && <Typography variant="body2" color="primary" fontWeight={700}>{formatTime(task.time)}</Typography>}
                {task.notes && <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{task.notes}</Typography>}
              </CardActionArea>
              <IconButton
                color="error"
                aria-label="Delete task"
                onClick={() => change(tasks.filter((t) => t.id !== task.id))}
              >
                <DeleteIcon />
              </IconButton>
            </Stack>
          </Card>
        ))}
        {tasks.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ py: 6 }}>No tasks yet.</Typography>
        )}
      </Stack>

      <Dialog
        open={renaming}
        onClose={() => setRenaming(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { component: "form", onSubmit: renameList } }}
      >
        <DialogTitle fontWeight={700}>Rename task list</DialogTitle>
        <DialogContent>
          <TextField name="name" label="Name" defaultValue={name} required autoFocus fullWidth sx={{ mt: 1 }} slotProps={{ htmlInput: { maxLength: 60 } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setRenaming(false)}>Cancel</Button>
          <Button type="submit" variant="contained">OK</Button>
        </DialogActions>
      </Dialog>

      <Fab
        color="primary"
        aria-label="Add task"
        disabled={tasks.length >= MAX_TASKS}
        onClick={() => setEditing({ title: "", time: "", notes: "" })}
        sx={{ position: "fixed", right: 24, bottom: 24 }}
      >
        <AddIcon />
      </Fab>

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
              name="time"
              type="time"
              label="Time (optional)"
              defaultValue={editing?.time ?? ""}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
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
          <Button color="inherit" onClick={() => setEditing(null)}>Cancel</Button>
          <Button type="submit" variant="contained">{editing?.id ? "Update" : "Add"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
