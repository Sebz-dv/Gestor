# DoMore — Gestor de Tareas (React + Vite + Tailwind)

Un dashboard de tareas moderno con **autenticación**, **dark mode**, **gráficas** y un set de componentes reutilizables. Minimal en complejidad, maximal en productividad.

> Hecho con React, Vite, Tailwind, Recharts, Framer Motion y buen café.

---

## ✨ Features

- **Auth** (Login / SignUp) con animaciones (Framer Motion), toggle de contraseña y aviso de **Caps Lock**.
- **Dashboards** (admin/usuario) con KPIs, **Recharts** (Pie/Bar), tabla de “Tareas Recientes”.
- **CRUD de tareas**: prioridad, fecha, checklist, adjuntos, asignación de usuarios.
- **Dark mode** global por clase `.dark` en `<html>` (toda la UI responde).
- **Internacionalización ligera**: `moment` en **es**.
- **Componentes accesibles** y reutilizables (Inputs, Modals, Cards, Charts…).

---

## 🧰 Stack

- **React 18** + **Vite**
- **Tailwind CSS** (con `@custom-variant dark`)
- **Framer Motion** (animaciones auth)
- **Recharts** (gráficas)
- **Axios** (HTTP)
- **Moment** (fechas, locale `es`)
- **react-icons / lucide-react** (iconos)

---

## 🚀 Quick Start

```bash
# Requisitos: Node 18+
npm install

# Desarrollo
npm run dev

# Build
npm run build

# Vista previa de la build
npm run preview
