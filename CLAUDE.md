# Nippon Quest — instrucciones para Claude

## Misión
Desarrollar Nippon Quest como una herramienta eficaz para aprender japonés. Cada cambio debe mejorar al menos uno de estos ejes: aprendizaje y retención, claridad de la experiencia, estabilidad técnica. No agregar complejidad si no aporta una mejora comprobable.

## Prioridades
1. Exactitud lingüística y pedagógica.
2. Integridad del progreso, ejercicios y datos del estudiante.
3. Accesibilidad, claridad y baja carga cognitiva.
4. Identidad visual y pulido estético.

Si dos objetivos entran en conflicto, prevalecen los primeros.

## Criterio pedagógico
- Enseñar de forma gradual: reconocimiento antes de velocidad; kana antes de introducir kanji; katakana solo en su mundo correspondiente.
- Para principiantes, usar español y hiragana sencillo en navegación e instrucciones. No introducir kanji o katakana decorativos o arbitrarios.
- Explicar errores concretos: distinguir forma, lectura y pronunciación; no usar mensajes genéricos cuando se conoce la confusión exacta.
- Cuidar romanización y aproximaciones fonéticas para hispanohablantes. Aclarar cuándo un ejemplo español solo aproxima un sonido.
- Aprovechar los datos de confusión y el repaso espaciado existentes antes de crear sistemas paralelos.
- No confundir velocidad de respuesta con dominio real.

## Integridad técnica
Antes de modificar:
- Leer los módulos afectados y sus dependencias.
- Identificar el efecto sobre localStorage, migraciones, progreso, XP, desbloqueos, sincronización y Service Worker.
- Preservar los formatos de datos existentes; cualquier migración debe ser explícita, retrocompatible y justificada.

No modificar motor, persistencia, sincronización, datos de ejercicios o arquitectura por una mejora visual aislada. No reemplazar sistemas existentes sin demostrar que la alternativa es mejor.

## Identidad visual
Respetar «Yoru no Kyoto»: índigo profundo, crema cálido, rosa sakura y Kuru. La interfaz debe priorizar legibilidad, orientación y concentración; evitar decoración que compita con el contenido.

## Protocolo de trabajo
Para cada tarea:
1. Inspeccionar el estado real del repositorio.
2. Definir el problema y el resultado esperado.
3. Proponer el cambio mínimo suficiente.
4. Implementar sin mezclar objetivos ajenos.
5. Verificar sintaxis, dependencias, estados límite y regresiones.
6. Informar qué se comprobó, qué no se pudo probar y qué queda pendiente.

No afirmar que una prueba pasó si no se ejecutó. Separar hechos verificados de hipótesis.

## Autonomía y límites
Cuestionar propuestas cuando haya una razón técnica o pedagógica concreta y explicar el motivo. No hacer refactorizaciones generales, cambios de arquitectura ni modificaciones fuera del alcance acordado sin autorización. Mantener los cambios pequeños, revisables y separados en Pull Requests por objetivo.

## Skills especializadas del proyecto

Usar las skills del repositorio cuando la tarea coincida con su ámbito:
- `japanese-pedagogy-auditor`: revisar exactitud lingüística, progresión, ejercicios, errores y retención.
- `nippon-quest-qa`: diseñar y ejecutar pruebas funcionales, de regresión, persistencia y PWA/offline.
- `yoru-design-guardian`: revisar identidad visual, Kuru, legibilidad, responsive y accesibilidad.

Para tareas que afecten varios ámbitos, invocar las skills relevantes y reconciliar sus hallazgos. La auditoría pedagógica tiene prioridad cuando una decisión visual o técnica pueda perjudicar el aprendizaje. Las skills no amplían la autorización de cambios: se mantienen los límites de autonomía de este archivo y del pedido explícito del usuario.
