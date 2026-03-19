import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'momentum-todo-v1'

const starterTasks = [
  {
    id: crypto.randomUUID(),
    title: 'Landing page wireframe',
    notes: 'Hero, pricing cards, testimonials',
    category: 'Work',
    priority: 'High',
    dueDate: new Date().toISOString().slice(0, 10),
    completed: false,
    createdAt: Date.now(),
  },
  {
    id: crypto.randomUUID(),
    title: 'English speaking practice',
    notes: '20 minutes, focus on passive voice',
    category: 'Study',
    priority: 'Medium',
    dueDate: '',
    completed: true,
    createdAt: Date.now() - 1000,
  },
]

const emptyForm = {
  title: '',
  notes: '',
  category: 'Personal',
  priority: 'Medium',
  dueDate: '',
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { tasks: starterTasks, trash: [], theme: 'dark' }
    }
    const parsed = JSON.parse(raw)
    return {
      tasks: parsed.tasks || starterTasks,
      trash: parsed.trash || [],
      theme: parsed.theme || 'dark',
    }
  } catch {
    return { tasks: starterTasks, trash: [], theme: 'dark' }
  }
}

function formatDate(date) {
  if (!date) return 'No date'
  return new Date(date + 'T00:00:00').toLocaleDateString()
}

function isToday(date) {
  return date === new Date().toISOString().slice(0, 10)
}

function getPriorityWeight(priority) {
  return { High: 3, Medium: 2, Low: 1 }[priority] || 0
}

function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-hint">{hint}</div>
    </div>
  )
}

function Ring({ progress }) {
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 120 120" className="ring-svg">
        <circle cx="60" cy="60" r={radius} className="ring-track" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          className="ring-progress"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-center">
        <strong>{progress}%</strong>
        <span>done</span>
      </div>
    </div>
  )
}

function App() {
  const [state, setState] = useState(loadState)
  const [form, setForm] = useState(emptyForm)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    document.documentElement.dataset.theme = state.theme
  }, [state])

  const completedCount = state.tasks.filter((task) => task.completed).length
  const progress = state.tasks.length ? Math.round((completedCount / state.tasks.length) * 100) : 0

  const filteredTasks = useMemo(() => {
    return [...state.tasks]
      .filter((task) => {
        const matchesQuery = [task.title, task.notes, task.category, task.priority]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase())

        if (!matchesQuery) return false

        if (filter === 'pending') return !task.completed
        if (filter === 'done') return task.completed
        if (filter === 'today') return isToday(task.dueDate)
        if (filter === 'high') return task.priority === 'High'
        return true
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed)
        if (getPriorityWeight(a.priority) !== getPriorityWeight(b.priority)) {
          return getPriorityWeight(b.priority) - getPriorityWeight(a.priority)
        }
        return b.createdAt - a.createdAt
      })
  }, [state.tasks, query, filter])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!form.title.trim()) return

    if (editingId) {
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === editingId
            ? {
                ...task,
                title: form.title.trim(),
                notes: form.notes.trim(),
                category: form.category,
                priority: form.priority,
                dueDate: form.dueDate,
              }
            : task,
        ),
      }))
    } else {
      const newTask = {
        id: crypto.randomUUID(),
        title: form.title.trim(),
        notes: form.notes.trim(),
        category: form.category,
        priority: form.priority,
        dueDate: form.dueDate,
        completed: false,
        createdAt: Date.now(),
      }
      setState((current) => ({ ...current, tasks: [newTask, ...current.tasks] }))
    }

    resetForm()
  }

  function startEdit(task) {
    setEditingId(task.id)
    setForm({
      title: task.title,
      notes: task.notes,
      category: task.category,
      priority: task.priority,
      dueDate: task.dueDate,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleTask(id) {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    }))
  }

  function moveToTrash(id) {
    setState((current) => {
      const task = current.tasks.find((item) => item.id === id)
      if (!task) return current
      return {
        ...current,
        tasks: current.tasks.filter((item) => item.id !== id),
        trash: [{ ...task, trashedAt: Date.now() }, ...current.trash],
      }
    })
    if (editingId === id) resetForm()
  }

  function restoreTask(id) {
    setState((current) => {
      const task = current.trash.find((item) => item.id === id)
      if (!task) return current
      const { trashedAt, ...restoredTask } = task
      return {
        ...current,
        tasks: [restoredTask, ...current.tasks],
        trash: current.trash.filter((item) => item.id !== id),
      }
    })
  }

  function clearTrash() {
    setState((current) => ({ ...current, trash: [] }))
  }

  function toggleTheme() {
    setState((current) => ({
      ...current,
      theme: current.theme === 'dark' ? 'light' : 'dark',
    }))
  }

  return (
    <div className="app-shell">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />

      <header className="topbar card glass">
        <div>
          <p className="eyebrow">Vite + React</p>
          <h1>Momentum Todo</h1>
          <p className="subtle">Silliq, premium, deploy-ready task manager.</p>
        </div>
        <button className="theme-btn" onClick={toggleTheme}>
          {state.theme === 'dark' ? '☀ Light' : '🌙 Dark'}
        </button>
      </header>

      <main className="layout">
        <section className="left-col">
          <div className="card form-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Task Studio</p>
                <h2>{editingId ? 'Edit task' : 'Create task'}</h2>
              </div>
              {editingId && (
                <button className="ghost-btn" onClick={resetForm}>
                  Cancel edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="task-form">
              <label>
                <span>Title</span>
                <input
                  value={form.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                  placeholder="Add a sharp task..."
                />
              </label>

              <label>
                <span>Notes</span>
                <textarea
                  rows="4"
                  value={form.notes}
                  onChange={(e) => updateForm('notes', e.target.value)}
                  placeholder="Tiny details, big clarity."
                />
              </label>

              <div className="grid-3">
                <label>
                  <span>Category</span>
                  <select value={form.category} onChange={(e) => updateForm('category', e.target.value)}>
                    <option>Personal</option>
                    <option>Work</option>
                    <option>Study</option>
                    <option>Health</option>
                    <option>Money</option>
                  </select>
                </label>

                <label>
                  <span>Priority</span>
                  <select value={form.priority} onChange={(e) => updateForm('priority', e.target.value)}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </label>

                <label>
                  <span>Due date</span>
                  <input type="date" value={form.dueDate} onChange={(e) => updateForm('dueDate', e.target.value)} />
                </label>
              </div>

              <button className="primary-btn" type="submit">
                {editingId ? 'Save changes' : 'Add task'}
              </button>
            </form>
          </div>

          <div className="card stats-grid">
            <StatCard label="Total" value={state.tasks.length} hint="all active tasks" />
            <StatCard label="Done" value={completedCount} hint="finished cleanly" />
            <StatCard label="Trash" value={state.trash.length} hint="recover anytime" />
            <div className="progress-card">
              <Ring progress={progress} />
            </div>
          </div>
        </section>

        <section className="right-col">
          <div className="card toolbar-card">
            <div className="toolbar-top">
              <input
                className="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks, notes, category..."
              />
            </div>

            <div className="filters">
              {['all', 'pending', 'done', 'today', 'high'].map((item) => (
                <button
                  key={item}
                  className={filter === item ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="card list-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Live Board</p>
                <h2>Tasks</h2>
              </div>
              <span className="counter">{filteredTasks.length} showing</span>
            </div>

            <div className="task-list">
              {filteredTasks.length === 0 ? (
                <div className="empty-state">
                  <h3>No tasks here</h3>
                  <p>Change the filter or create a fresh one.</p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <article key={task.id} className={task.completed ? 'task-card done' : 'task-card'}>
                    <button className="check-btn" onClick={() => toggleTask(task.id)}>
                      {task.completed ? '✓' : ''}
                    </button>

                    <div className="task-main">
                      <div className="task-topline">
                        <h3>{task.title}</h3>
                        <div className="chip-row">
                          <span className={`chip priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
                          <span className="chip">{task.category}</span>
                          <span className="chip">{formatDate(task.dueDate)}</span>
                        </div>
                      </div>

                      {task.notes && <p className="task-notes">{task.notes}</p>}
                    </div>

                    <div className="task-actions">
                      <button className="ghost-btn" onClick={() => startEdit(task)}>Edit</button>
                      <button className="danger-btn" onClick={() => moveToTrash(task.id)}>Trash</button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="card trash-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Safety Net</p>
                <h2>Trash Bin</h2>
              </div>
              <button className="ghost-btn" onClick={clearTrash} disabled={state.trash.length === 0}>
                Clear trash
              </button>
            </div>

            <div className="trash-list">
              {state.trash.length === 0 ? (
                <p className="subtle">Trash is empty. Clean desk energy ✨</p>
              ) : (
                state.trash.map((task) => (
                  <article key={task.id} className="trash-item">
                    <div>
                      <strong>{task.title}</strong>
                      <p>{task.category} • {task.priority} • {formatDate(task.dueDate)}</p>
                    </div>
                    <button className="primary-btn small" onClick={() => restoreTask(task.id)}>
                      Restore
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
