# Mis Gastos

App web para registrar cuánto gastas al mes y en qué categorías. Está pensada para usarse desde el celular.

- Cada persona instala la app en su propio celular. **Los datos se guardan solo en ese celular** (localStorage).
- No hay servidor, base de datos externa, cuentas ni inicio de sesión. La app no hace ninguna petición a servicios externos.
- Funciona sin internet una vez instalada.
- Está hecha con HTML, CSS y JavaScript puro, sin librerías ni paso de compilación.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de la app |
| `styles.css` | Estilos (diseño para celular, con modo oscuro automático) |
| `app.js` | Toda la lógica: gastos, presupuestos, comparación, respaldo |
| `manifest.json` | Datos para instalar la app (nombre, íconos, colores) |
| `sw.js` | Service worker: guarda la app para que funcione sin internet |
| `icons/` | Íconos de la app |

## 1. Probarla en la computadora

El service worker y la instalación solo funcionan si la app se abre desde un servidor (`http://localhost`), no con doble clic en `index.html`.

**Opción A: con Python** (si lo tienes instalado)

1. Abre una terminal en la carpeta de la app.
2. Ejecuta uno de estos comandos (según cómo esté instalado Python):
   ```
   py -m http.server 8000
   ```
   ```
   python3 -m http.server 8000
   ```
3. Abre en el navegador: <http://localhost:8000>
4. Para ver cómo se ve en celular: presiona `F12` y activa el modo de dispositivo móvil (ícono de celular/tableta).
5. Para detener el servidor, presiona `Ctrl + C` en la terminal.

**Opción B: con Visual Studio Code**

1. Instala la extensión **Live Server**.
2. Abre la carpeta de la app, haz clic derecho en `index.html` y elige **Open with Live Server**.

> Los datos que registres en la computadora quedan guardados solo en ese navegador. No se pasan al celular.

> Si cambias el código y no ves los cambios, recarga con `Ctrl + Shift + R`. El service worker guarda una copia de la app y, sin eso, puede mostrarte la versión anterior.

## 2. Publicarla en GitHub Pages (gratis)

1. Crea una cuenta en <https://github.com> si no tienes una.
2. Arriba a la derecha, toca **+** → **New repository**.
3. Ponle un nombre, por ejemplo `mis-gastos`. Marca **Public** y toca **Create repository**.
4. En la página del repositorio nuevo, toca **uploading an existing file** (o **Add file** → **Upload files**).
5. Arrastra **todos los archivos y la carpeta `icons`** de la app. `index.html` debe quedar en la raíz del repositorio, no dentro de otra carpeta.
6. Abajo, toca **Commit changes**.
7. Ve a **Settings** → **Pages** (en el menú de la izquierda).
8. En **Build and deployment** → **Source**, elige **Deploy from a branch**.
9. En **Branch**, elige `main` y la carpeta `/ (root)`. Toca **Save**.
10. Espera uno o dos minutos y recarga la página. Arriba aparecerá la dirección de tu app, con esta forma:
    `https://usuario.github.io/nombre-del-repositorio/`
    (cambia `usuario` por tu usuario de GitHub y `nombre-del-repositorio` por el nombre que le pusiste, por ejemplo `mis-gastos`).

Esa es la dirección que compartes con tu familia. Como la app usa rutas relativas, funciona en esa subcarpeta sin cambiar nada.

> El repositorio es público: cualquiera puede ver el **código** de la app, pero **nadie puede ver los gastos**, porque estos solo existen en cada celular.

### Actualizar la app después de publicarla

Si cambias algún archivo, abre `sw.js` y sube el número de versión en esta línea:

```js
const CACHE = 'mis-gastos-v1';   // cámbialo a 'mis-gastos-v2', luego v3, etc.
```

Después sube los archivos cambiados a GitHub. Los celulares descargan la versión nueva la próxima vez que abren la app con internet. Puede que haga falta cerrar la app y abrirla otra vez para ver los cambios. **Actualizar la app no borra los datos.**

## 3. Instalarla en el celular

La app también tiene una pantalla **Ayuda** con estas instrucciones.

### iPhone (Safari)

1. Abre la dirección de la app en **Safari** (no en otro navegador).
2. Toca el botón **Compartir** (cuadrado con flecha hacia arriba).
3. Toca **Agregar a pantalla de inicio** → **Agregar**.
4. **Usa siempre la app desde el ícono de la pantalla de inicio, no desde Safari.** La app instalada guarda sus datos aparte de Safari, y iPhone puede borrar los datos de las páginas que se abren en Safari si no se usan por un tiempo.

### Android (Chrome)

1. Abre la dirección de la app en **Chrome**.
2. Toca el menú **⋮** → **Instalar app** (o **Agregar a la pantalla principal**).
3. Confirma con **Instalar**.

## Respaldo (muy importante)

Como los datos viven solo en el celular, si se pierde o se borran los datos del navegador, se pierden los gastos.

- En la pantalla **Respaldo**, toca **Exportar respaldo**. Se descarga un archivo `mis-gastos-respaldo-AAAA-MM-DD.json` con todos los gastos y presupuestos. En iPhone se abre el menú Compartir: elige **Guardar en Archivos**, o envíatelo por correo.
- Guarda ese archivo en un lugar seguro (correo, Google Drive, iCloud, etc.).
- Para restaurar, o para pasar los datos a un celular nuevo: instala la app, ve a **Respaldo** → **Importar respaldo** y elige el archivo. **Esto reemplaza todos los datos actuales de ese celular.**
- La app muestra la fecha del último respaldo exportado. Avisa si nunca se hizo uno o si pasaron más de 30 días.

## Cómo funciona

- **Gastos:** monto (mayor que 0, hasta 2 decimales; acepta coma o punto), categoría, fecha (hoy por defecto; no se permiten fechas futuras), método de pago y nota (opcionales; la nota tiene hasta 100 caracteres). Para editar o borrar un gasto, tócalo en la lista. Antes de borrar, la app pide confirmación.
- **Categorías:** 44 categorías fijas. Las 8 primeras aparecen como botones grandes y el resto está en "Más categorías".
- **Presupuestos:** se ponen por categoría y valen para el mes calendario. Un cambio rige desde el mes actual en adelante; los meses anteriores conservan el presupuesto que tenían. La barra se pone amarilla al llegar al 80 % y roja al pasar del 100 %.
- **Pantalla principal:** muestra el total del mes, el gasto por categoría con su presupuesto y la lista de gastos. Con las flechas ‹ › se pasa a otros meses, y toda la pantalla cambia al mes elegido.
- **Comparar:** compara el mes actual con el anterior por categoría (en $ y en %; si el mes anterior fue $0 dice "nuevo") y muestra un gráfico con el total de los últimos 6 meses.

### Formato del archivo de respaldo

```json
{
  "app": "Mis Gastos",
  "version": 1,
  "exportedAt": "2026-11-19T15:30:00.000Z",
  "expenses": [
    { "id": "…", "amount": 1250, "cat": 1, "date": "2026-11-19", "method": "Efectivo", "note": "", "createdAt": 0, "updatedAt": 0 }
  ],
  "budgets": { "1": [ { "from": "2026-11", "amount": 20000 } ] }
}
```

`amount` está en centavos (1250 = $12,50). `cat` es el número de la categoría (1 = Supermercado y víveres … 44 = Otros). En `budgets`, cada categoría guarda el historial de cambios: desde qué mes rige cada monto (`null` significa que se quitó el presupuesto).
