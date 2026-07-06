# Prompt para disenar mundos y mecanicas — Pajaros Matematicos

## Contexto del juego

Juego educativo tipo Angry Birds para ninos. El jugador lanza pajaros con una resortera para pegarle al cerdo que tiene la respuesta correcta de una operacion matematica (suma/resta). Hay 3 cerdos con numeros diferentes, solo 1 es correcto.

## Motor actual

- Canvas 2D con fisica custom (gravedad, velocidad, colisiones por distancia)
- Bloques rectangulares (madera, piedra, hielo, TNT) que se "tumban" al ser golpeados
- NO hay fisica real de cuerpos rigidos — los bloques no caen unos sobre otros, solo se tumban individualmente con rotacion
- El pajaro vuela en arco parabolico, atraviesa bloques (los tumba y pierde velocidad)
- Explosiones (TNT) tumban bloques y pigs en un radio

## Lo que necesito

Disenar **6 mundos** con identidad unica. Cada mundo debe tener:

### 1. Mecanica de mundo (gameplay unica)
NO solo estetica diferente. Cada mundo cambia COMO juegas. Ejemplos de lo que busco:
- Elementos del escenario que afectan la trayectoria del pajaro
- Obstaculos que se mueven o cambian
- Condiciones que hacen que el jugador tenga que pensar diferente
- Algo que haga que "jugar en Desierto se sienta diferente a jugar en Nieve"

### 2. Obstaculos especiales del mundo
Objetos que NO son bloques ni cerdos. Cosas del escenario que interactuan con el pajaro:
- Pueden desviar, frenar, acelerar, rebotar, bloquear
- Deben ser simples de implementar con canvas 2D (rectangulos, circulos, lineas)
- Deben ser visualmente claros (el nino entiende que hacen al verlos)

### 3. Generacion aleatoria de niveles
Cada ronda debe sentirse diferente. Necesito REGLAS para generar niveles aleatorios por mundo:
- Donde poner los cerdos (posiciones X, Y)
- Donde poner los obstaculos del mundo
- Que combinaciones funcionan bien
- Que combinaciones evitar (ej: cerdo imposible de alcanzar)
- Como escalar la dificultad (mas obstaculos, posiciones mas dificiles)

### 4. Niveles hardcodeados para modo Aventura
3 niveles por mundo (15 rondas total por mundo, 5 por nivel). Cada nivel con una "idea" que ensena al jugador la mecanica del mundo:
- Nivel 1: introduccion a la mecanica (facil)
- Nivel 2: mecanica combinada con fuertes
- Nivel 3: desafio que requiere dominar la mecanica

## Los 6 mundos

1. **Pradera** (tutorial, facil)
2. **Desierto** (calor/arena)
3. **Nieve** (frio/hielo)
4. **Volcan** (fuego/lava)
5. **Playa** (agua/olas)
6. **Noche** (oscuridad/misterio)

## Restricciones tecnicas

- Todo se dibuja con canvas 2D (`ctx.fillRect`, `ctx.arc`, `ctx.beginPath`, etc.)
- Los objetos son datos simples: `{x, y, w, h, tipo, vx, vy}` — NO hay motor de fisica real
- Colisiones se calculan por distancia (`dist(a,b) < radio`)
- El pajaro puede atravesar bloques (los tumba y pierde velocidad, no rebota)
- El loop corre a 60fps con `requestAnimationFrame`
- Debe funcionar en movil (touch) y desktop (mouse)
- Debe ser entendible para un nino de 6 anos (visual claro, sin texto complejo)

## Formato de respuesta

Para cada mundo dame:

```
### Mundo: [nombre]

**Mecanica principal**: [1 frase que explica que hace unico a este mundo]

**Obstaculos especiales**:
- [nombre]: [que hace, como se ve, como afecta al pajaro]
- [nombre]: ...

**Reglas de generacion aleatoria**:
- Posiciones de cerdos: [reglas]
- Posiciones de obstaculos: [reglas]
- Combinaciones buenas: [ejemplos]
- Combinaciones prohibidas: [ejemplos]
- Escalado de dificultad: [como se hace mas dificil]

**Niveles hardcodeados (Aventura)**:
- Nivel 1: [descripcion del layout y la idea]
- Nivel 2: [descripcion]
- Nivel 3: [descripcion]

**Implementacion simplificada**:
- Datos del obstaculo: `{x, y, w, h, tipo, ...propiedades}`
- En `actualizar()`: [que logica agregar]
- En `dibujar()`: [como se ve visualmente]
```
