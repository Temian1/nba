# 🏀 Análisis de Props NBA

Una aplicación web completamente automatizada en español para analizar apuestas de props de jugadores de la NBA, similar a Props.Cash.

## 🌟 Características

- **Ingesta Automática de Datos**: Obtiene y almacena estadísticas completas de jugadores NBA diariamente
- **Análisis Integral de Props**: Permite analizar el rendimiento de cualquier jugador contra líneas de apuestas personalizables
- **Filtrado Avanzado**: Soporta filtros por local/visitante, umbrales de minutos, splits móviles, oponente, etc.
- **Visualizaciones Interactivas**: Gráficos de barras coloreados por resultados over/under usando Chart.js
- **Interfaz en Español**: UI completamente localizada con formateo de fechas y números en español
- **Análisis de Tendencias**: Calcula tasas de acierto, promedios y forma reciente (últimos 5/10/20 partidos)

## 🛠️ Stack Tecnológico

- **Frontend & Backend**: Next.js 15 (App Router)
- **Base de Datos**: PostgreSQL con Drizzle ORM
- **API de Datos**: balldontlie.io (gratuita, 60 requests/minuto)
- **Visualizaciones**: Chart.js con react-chartjs-2
- **Internacionalización**: next-intl
- **Estilos**: Tailwind CSS
- **Iconos**: Lucide React
- **Fechas**: date-fns
- **Programación**: node-cron

## 📋 Requisitos Previos

- Node.js 18+ 
- PostgreSQL 12+
- Cuenta en [balldontlie.io](https://www.balldontlie.io/) para obtener API key gratuita

## 🚀 Instalación

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/nba_props"
BALLDONTLIE_API_KEY="tu_api_key_aqui"
```

### 3. Configurar la base de datos

#### Crear la base de datos
```sql
CREATE DATABASE nba_props;
```

#### Generar y ejecutar migraciones
```bash
# Generar archivos de migración
npm run db:generate

# Ejecutar migraciones
npm run db:migrate
```

### 4. Sincronización inicial de datos

```bash
# Iniciar el servidor de desarrollo
npm run dev

# En otra terminal, sincronizar datos
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'
```

## 🎯 Uso

### Interfaz Web

1. **Buscar Jugador**: Usa la barra de búsqueda para encontrar jugadores
2. **Seleccionar Prop**: Elige el tipo de estadística (puntos, rebotes, etc.)
3. **Establecer Línea**: Ingresa la línea over/under
4. **Aplicar Filtros**: Usa filtros avanzados para refinar el análisis
5. **Ver Resultados**: Analiza gráficos, estadísticas y tendencias

### API Endpoints

#### Sincronización de Datos
```bash
POST /api/sync
{"type": "daily"}
```

#### Análisis de Props
```bash
POST /api/analyze-prop
{
  "playerId": 123,
  "propType": "pts",
  "propLine": 25.5
}
```

## 📊 Tipos de Props Soportados

- **pts**: Puntos
- **reb**: Rebotes
- **ast**: Asistencias
- **stl**: Robos
- **blk**: Bloqueos
- **turnover**: Pérdidas
- **pra**: Puntos + Rebotes + Asistencias
- **pr**: Puntos + Rebotes
- **pa**: Puntos + Asistencias
- **ra**: Rebotes + Asistencias

## 🚀 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega automáticamente

### Variables de Entorno para Producción
```env
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
BALLDONTLIE_API_KEY="tu_api_key"
NODE_ENV="production"
```

## 📝 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construir para producción
npm start           # Servidor de producción
npm run db:generate  # Generar migraciones
npm run db:migrate   # Ejecutar migraciones
npm run db:studio    # Abrir Drizzle Studio
```
