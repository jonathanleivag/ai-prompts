# Generación de Release Notes

Actúa como Release Manager Senior.

## Contexto

Release: (nombre del release)
-release/ddmmyyyy

Commits:
-git log (commit1)
-git log (commit2)
-git log (commit3)

## Objetivo

Generar Release Notes orientadas a:

- Clientes
- Equipo de soporte
- Equipo de QA
- Equipo técnico

## Instrucciones

Analiza los cambios realizados y clasifícalos en:

### Nuevas Funcionalidades

### Mejoras

### Correcciones

### Cambios Técnicos

### Impacto para Usuarios

### Consideraciones Operativas

### Riesgos Conocidos

## Formato de Entrega

# Release {{RELEASE_NAME}}

Fecha: dd-mm-yyyy

## Nuevas Funcionalidades

## Mejoras

## Correcciones

## Cambios Técnicos

## Impacto para Usuarios

## Riesgos Conocidos

## Recomendaciones

con toda esa información quiero que en base a esto me generes un release-notes-ddmmyyyy.md en el directorio {{OUTPUT_PATH}}
