# Diseño del generador de prompts

## Objetivo

Crear una herramienta de línea de comandos que complete las variables de cualquiera de las ocho plantillas Markdown del repositorio y copie automáticamente el prompt resultante al portapapeles de macOS.

## Interfaz de uso

El comando principal será una función de Zsh llamada `prompt` y podrá ejecutarse desde cualquier directorio.

```zsh
prompt 01
prompt 01-requirement-codex.md
prompt 01 FEATURE="Descripción" OUTPUT_PATH="docs/feature.md"
```

El primer argumento identificará la plantilla mediante su ruta, nombre de archivo o prefijo numérico único. Los argumentos siguientes podrán proporcionar valores con el formato `VARIABLE=valor`.

## Comportamiento

1. Resolver la plantilla solicitada dentro del repositorio `ai-prompts`.
2. Leer su contenido sin modificar el archivo original.
3. Detectar automáticamente cada variable con formato `{{VARIABLE}}` y eliminar duplicados.
4. Aplicar los valores recibidos como argumentos con nombre.
5. Solicitar interactivamente los valores que falten.
6. Sustituir todas las apariciones de cada variable.
7. Validar que no queden marcadores sin completar.
8. Imprimir el prompt generado en la salida estándar.
9. Copiar exactamente el mismo contenido al portapapeles mediante `pbcopy`.
10. Mostrar la confirmación en la salida de errores para no contaminar el prompt emitido.

Los valores podrán contener espacios. Un valor vacío se considerará inválido y volverá a solicitarse cuando la ejecución sea interactiva.

## Componentes

### `scripts/generate-prompt.js`

Será un script Node.js sin dependencias externas. Resolverá plantillas, analizará argumentos, solicitará valores, sustituirá variables, validará el resultado y ejecutará `pbcopy`.

### Función `prompt` en `.zshrc`

Invocará el generador con una ruta absoluta para que el comando funcione independientemente del directorio actual. Reenviará todos los argumentos sin alterarlos.

### `README.md`

Documentará la instalación implícita en `.zshrc`, la sintaxis interactiva, el uso con argumentos y algunos ejemplos. Se conservarán los cambios que ya existan en el archivo.

## Manejo de errores

La herramienta terminará con un mensaje claro y código distinto de cero cuando:

- no se indique una plantilla;
- la plantilla no exista o el prefijo coincida con más de un archivo;
- un argumento no use el formato `VARIABLE=valor`;
- se proporcione una variable que no exista en la plantilla;
- falte un valor en una sesión sin terminal interactiva;
- no esté disponible Node.js o falle `pbcopy`.

No se modificará ninguna plantilla cuando ocurra un error.

## Verificación

Las pruebas cubrirán la extracción y deduplicación de variables, sustituciones repetidas, valores con espacios, selección por prefijo, argumentos inválidos, variables desconocidas y variables faltantes en modo no interactivo. También se comprobará la sintaxis de `.zshrc` con `zsh -n` y se hará una ejecución real verificando el contenido copiado con `pbpaste`.

## Alcance

Se mantendrá intacto el contenido de los ocho archivos de prompts. La solución será genérica para futuras plantillas que utilicen marcadores `{{VARIABLE}}` y estará orientada a macOS por el uso solicitado de `pbcopy`.
