# Cerebro del "Vendedor Digital" (Bot) — Estructura de 3 partes

Para que este "vendedor digital" (el bot) funcione, necesitamos estructurar su cerebro en 3 partes fundamentales. Así es como funciona la lógica detrás de escena:

---

## 1. La Identidad y el Rol (El "System Prompt")

Lo primero que hace el sistema es definir quién es antes de que llegue el primer cliente.

**Instrucción al Bot:**
```
"No eres una máquina cualquiera. Eres un ingeniero agrónomo experto que trabaja para Agro Montes".
```

**El Tono:**
- Amable
- Técnico pero entendible
- Siempre enfocado en solucionar problemas del campo

---

## 2. La Base de Conocimiento (Tu Catálogo Traducido)

Aquí está el problema principal que resolvimos: Tu imagen tenía los Nombres (ej. "Triple Impacto") pero la columna Descripción estaba vacía.

Si un cliente dice "Quiero Triple Impacto", el bot encuentra el nombre y listo. Pero si un cliente dice "Mis plantas no crecen, están estresadas", el bot no sabría qué vender si solo tiene los nombres.

Por eso, estructuramos la lógica así (Asociación Problema-Solución):

- Cuando el bot lee: "Triple Impacto"
  - Nosotros le enseñamos que significa: "Energía, arranque, reactivación de planta estresada".

- Cuando el bot lee: "Potasio K50"
  - Nosotros le enseñamos que significa: "Llenado de fruto, peso, maduración".

- Cuando el bot lee: "Kanelo Oil"
  - Nosotros le enseñamos que significa: "Repelente, preventivo, orgánico, olor a canela".

¿Cómo funciona esto en la práctica? El bot no busca palabras exactas, busca intenciones. Si el cliente dice "necesito que la fruta pese más", el bot analiza su "cerebro", ve que Potasio K50 está asociado a "peso", y lo recomienda.

---

## 3. Las Reglas de Negocio (Los Límites)

Un vendedor humano sabe qué puede decir y qué no. Al bot hay que configurarle estas reglas estrictas para no meter la pata:

- **Regla de Precios:** Como los precios de los agroquímicos cambian por el dólar o el stock, la regla es: "NUNCA inventes un precio. Si piden precio, dales el enlace al WhatsApp del vendedor humano".

- **Regla de Diagnóstico:** Si el cliente menciona una enfermedad grave (ej. un virus complejo), la regla es: "Recomienda un producto paliativo pero sugiere consultar a un ingeniero en campo".

---

## El Flujo de una Conversación (Paso a Paso)

Imagina que esto sucede en milisegundos cuando un cliente escribe:

**Paso A: Entrada (El Cliente habla)**

Cliente: "Hola, tengo mucha arañita roja en mi palto y se le caen las hojas."

**Paso B: Análisis (El Bot piensa)**

- Identifica el cultivo: Palto.
- Identifica el problema: Plaga (Arañita roja) + Síntoma (Caída de hojas).
- Consulta el Catálogo:
  - Busca en la categoría FITOPROTECTORES.
  - Encuentra Sulfa Max 87 (Azufre funciona para ácaros) y Omega Oil369 (Aceite funciona para ahogar la plaga).
  - Busca en la categoría NUTRIENTES algo para que la hoja no caiga: Encuentra Amarre.

**Paso C: Respuesta (El Bot habla)**

Bot: "Hola. Para la arañita roja en palto te recomiendo aplicar Sulfa Max 87 o Omega Oil369 para controlar la plaga rápidamente. Si la caída de hojas es fuerte, podrías complementar con Amarre 3.5 para fortalecer la planta. ¿Te gustaría cotizar estos productos?"

---

## Resumen de la Estructura

Para que funcione en tu proyecto, no necesitas escribir mil líneas de código, solo necesitas tener estos datos ordenados:

- **Categoría** (Ej. Bioestimulante)
- **Nombre** (Ej. Globo Gib)
- **Ingrediente Activo/Función** (Ej. Ácido Giberélico / Crecimiento) <- Esto es lo vital que faltaba en tu excel.
- **Uso principal** (Ej. Estiramiento de células).

---

### Notas adicionales / Buenas prácticas

- Mantén la base de conocimiento actualizada: cada producto necesita una descripción clara y funciones/indicaciones.
- Vincula cada producto con palabras clave e intenciones (sinónimos y síntomas comunes) para mejorar las coincidencias por intención.
- Implementa límites explícitos para consultas médicas o de diagnóstico: cuando haya duda, elevar el caso a un ingeniero humano con enlace de contacto.
- Evita respuestas que incluyan precios o promesas de resultados sin previa evaluación de campo.

---

Si quieres, puedo:
- Formatearlo en JSON o CSV para que lo cargues a tu base de datos o a un `spreadsheet`.
- Implementar un ejemplo de archivo de configuración para el bot que use estas reglas para tomar decisiones.
- Generar plantillas para Excel/CSV con las columnas necesarias (Categoría, Nombre, Descripción/Función, Palabras clave, Acción recomendada, Reglas aplicables).

¿Te gustaría que también cree la plantilla CSV o lo deje así en Markdown?