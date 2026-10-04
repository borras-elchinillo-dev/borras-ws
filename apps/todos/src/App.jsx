import { useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'borras-todos-v1'
const THEME_KEY = 'borras-todos-theme'

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved) return saved === 'dark'
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  } catch {
    return false
  }
}

export default function App() {
  const [todos, setTodos] = useState(load)
  const [text, setText] = useState('')
  const [filter, setFilter] = useState('all') // all | active | done
  const [deleting, setDeleting] = useState(new Set())
  const [justAdded, setJustAdded] = useState(null)
  const [toggled, setToggled] = useState(null)
  const [dark, setDark] = useState(loadTheme)
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const inputRef = useRef(null)
  // Touch drag (iOS Safari no soporta HTML5 drag & drop con touch)
  const touchDrag = useRef({ id: null, overId: null })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }, [todos])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  useEffect(() => {
    if (justAdded) {
      const t = setTimeout(() => setJustAdded(null), 600)
      return () => clearTimeout(t)
    }
  }, [justAdded])

  useEffect(() => {
    if (toggled) {
      const t = setTimeout(() => setToggled(null), 500)
      return () => clearTimeout(t)
    }
  }, [toggled])

  const remaining = todos.filter(t => !t.done).length
  const completed = todos.length - remaining

  const visible = useMemo(() => {
    if (filter === 'active') return todos.filter(t => !t.done)
    if (filter === 'done') return todos.filter(t => t.done)
    return todos
  }, [todos, filter])

  const progress = todos.length === 0 ? 0 : Math.round((completed / todos.length) * 100)
  const canDrag = filter === 'all'

  function addTodo(e) {
    e?.preventDefault()
    const value = text.trim()
    if (!value) {
      inputRef.current?.focus()
      inputRef.current?.classList.add('shake')
      setTimeout(() => inputRef.current?.classList.remove('shake'), 400)
      return
    }
    const item = { id: uid(), text: value, done: false, createdAt: Date.now() }
    setTodos(prev => [item, ...prev])
    setJustAdded(item.id)
    setText('')
    inputRef.current?.focus()
  }

  function toggleTodo(id) {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)))
    setToggled(id)
  }

  function removeTodo(id) {
    setDeleting(prev => new Set(prev).add(id))
    setTimeout(() => {
      setTodos(prev => prev.filter(t => t.id !== id))
      setDeleting(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 280)
  }

  function clearCompleted() {
    const ids = todos.filter(t => t.done).map(t => t.id)
    setDeleting(new Set(ids))
    setTimeout(() => {
      setTodos(prev => prev.filter(t => !t.done))
      setDeleting(new Set())
    }, 280)
  }

  // Drag & drop reorder (only in "all" filter for predictable order)
  function onDragStart(e, id) {
    if (!canDrag) return
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    // Needed for Firefox
    e.dataTransfer.setData('text/plain', id)
  }

  function onDragOver(e, id) {
    if (!canDrag || !dragId || dragId === id) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }

  function onDrop(e, targetId) {
    if (!canDrag || !dragId) return
    e.preventDefault()
    const from = todos.findIndex(t => t.id === dragId)
    const to = todos.findIndex(t => t.id === targetId)
    if (from === -1 || to === -1 || from === to) {
      setDragId(null)
      setDragOverId(null)
      return
    }
    const next = [...todos]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setTodos(next)
    setDragId(null)
    setDragOverId(null)
  }

  function onDragEnd() {
    setDragId(null)
    setDragOverId(null)
  }

  // --- Drag táctil con Pointer Events (para iOS / touch) ---
  function onTouchDragStart(e, id) {
    if (!canDrag || e.pointerType !== 'touch') return
    e.preventDefault()
    touchDrag.current.id = id
    touchDrag.current.overId = null
    setDragId(id)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  function onTouchDragMove(e) {
    const s = touchDrag.current
    if (!s.id) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const itemEl = el && el.closest ? el.closest('[data-todo-id]') : null
    const overId = itemEl ? itemEl.dataset.todoId : null
    s.overId = overId && overId !== s.id ? overId : null
    setDragOverId(s.overId)
  }

  function onTouchDragEnd() {
    const s = touchDrag.current
    const { id, overId } = s
    s.id = null
    s.overId = null
    setDragId(null)
    setDragOverId(null)
    if (id && overId && overId !== id) {
      setTodos(prev => {
        const from = prev.findIndex(t => t.id === id)
        const to = prev.findIndex(t => t.id === overId)
        if (from < 0 || to < 0 || from === to) return prev
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        return next
      })
    }
  }

  return (
    <div className={`page ${dark ? 'dark' : ''}`}>
      <div className="bg-orb orb-a" />
      <div className="bg-orb orb-b" />

      <main className="card">
        <header className="header">
          <div>
            <h1>Mis todos</h1>
            <p className="subtitle">
              {todos.length === 0
                ? 'Empieza agregando tu primera tarea'
                : `${remaining} pendiente${remaining === 1 ? '' : 's'} · ${completed} hecha${completed === 1 ? '' : 's'}`}
            </p>
          </div>
          <div className="header-actions">
            <button
              className="theme-toggle"
              onClick={() => setDark(d => !d)}
              aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={dark ? 'Modo claro' : 'Modo oscuro'}
            >
              <span className="theme-icon">{dark ? '☀️' : '🌙'}</span>
            </button>
            <div className="progress-wrap" title={`${progress}% completado`}>
              <svg viewBox="0 0 36 36" className="progress-ring">
                <path className="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path
                  className="ring-fg"
                  strokeDasharray={`${progress}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.5" className="ring-text">{progress}%</text>
              </svg>
            </div>
          </div>
        </header>

        <form className="composer" onSubmit={addTodo}>
          <input
            ref={inputRef}
            className="input"
            placeholder="¿Qué sigue? Ej. comprar café…"
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={120}
          />
          <button type="submit" className="btn-primary" aria-label="Agregar tarea">
            <span className="btn-plus">+</span> Agregar
          </button>
        </form>

        <div className="filters" role="tablist" aria-label="Filtrar tareas">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'active', label: 'Pendientes' },
            { key: 'done', label: 'Hechas' },
          ].map(f => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={`chip ${filter === f.key ? 'chip-active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          {completed > 0 && (
            <button className="link-danger" onClick={clearCompleted}>
              Limpiar hechas
            </button>
          )}
        </div>

        {canDrag && todos.length > 1 && (
          <p className="drag-hint">Arrastra para reordenar ↕</p>
        )}

        <ul className="list">
          {visible.length === 0 && (
            <li className="empty">
              <div className="empty-emoji">✨</div>
              <p>{filter === 'done' ? 'Nada hecho todavía' : filter === 'active' ? 'Todo al día. Bien ahí.' : 'Sin tareas por aquí'}</p>
            </li>
          )}
          {visible.map(todo => {
            const isDeleting = deleting.has(todo.id)
            const isDragging = dragId === todo.id
            const isOver = dragOverId === todo.id
            return (
              <li
                key={todo.id}
                data-todo-id={todo.id}
                draggable={canDrag}
                onDragStart={e => onDragStart(e, todo.id)}
                onDragOver={e => onDragOver(e, todo.id)}
                onDrop={e => onDrop(e, todo.id)}
                onDragEnd={onDragEnd}
                className={`item ${todo.done ? 'is-done' : ''} ${isDeleting ? 'is-leaving' : ''} ${
                  justAdded === todo.id ? 'is-entering' : ''
                } ${isDragging ? 'is-dragging' : ''} ${isOver ? 'is-over' : ''} ${canDrag ? 'draggable' : ''}`}
              >
                <span
                  className="drag-handle"
                  title="Arrastrar para reordenar"
                  aria-hidden
                  onPointerDown={e => onTouchDragStart(e, todo.id)}
                  onPointerMove={onTouchDragMove}
                  onPointerUp={onTouchDragEnd}
                  onPointerCancel={onTouchDragEnd}
                >⋮⋮</span>
                <button
                  className={`check ${toggled === todo.id ? 'pop' : ''}`}
                  onClick={() => toggleTodo(todo.id)}
                  aria-label={todo.done ? 'Marcar pendiente' : 'Marcar hecha'}
                >
                  <svg viewBox="0 0 24 24" className="check-icon">
                    <path d="M5 13l4 4L19 7" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="item-text">{todo.text}</span>
                <button className="btn-delete" onClick={() => removeTodo(todo.id)} aria-label="Eliminar">
                  ×
                </button>
              </li>
            )
          })}
        </ul>

        <footer className="footer">
          <span className="hint">Un click basta 😉</span>
          <span className="count">{todos.length} total</span>
        </footer>
      </main>
    </div>
  )
}
