# MIT 6.002 회로·전자 강의노트(MIT OCW)(CC BY-NC-SA)

> 원문: MIT OpenCourseWare — https://ocw.mit.edu · CC BY-NC-SA 4.0 · © Massachusetts Institute of Technology


CIRCUITS
AND
6.002
ELECTRONICS
Introduction and Lumped Circuit Abstraction
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
ADMINISTRIVIA
(cid:49) Lecturer: Prof. Anant Agarwal
(cid:132) Textbook: Agarwal and Lang (A&L)
(cid:132) Readings are important!
Handout no. 3
(cid:132) Web site —
http://web.mit.edu/6.002/www/fall00
(cid:132) Assignments —
Homework exercises
Labs
Quizzes
Final exam
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
(cid:132)Two homework assignments can
be missed (except HW11).
(cid:132) Collaboration policy
Homework
You may collaborate with
others, but do your own
write-up.
Lab
You may work in a team of
two, but do you own write-up.
(cid:132) Info handout
(cid:132) Reading for today —
Chapter 1 of the book
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
What is engineering?
Purposeful use of science
What is 6.002 about?
Gainful employment of
Maxwell’s equations
From electrons to digital gates
and op-amps
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1

| Nature as observed in experimentsV 3 6 9 12 |  |  |  |  |  |  | … |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V 3 6 9 12 | V | 3 | 6 | 9 | 12 |  | … |
| I 0.1 0.2 0.3 0.4 | I | 0.1 | 0.2 | 0.3 | 0.4 |  | … |
| I 0.1 0.2 0.3 0.4 | I | 0.1 | 0.2 | 0.3 | 0.4 |  | … |

Physics laws or “abstractions”
(cid:122) Maxwell’s abstraction for

![이미지](images/page004_img00.webp)

(cid:122) Ohm’s tables of data
V = R I
Lumped circuit abstraction
+ –
R V C L M S
Simple amplifier abstraction
200.6

| Digital abstraction |  |  |  |  |
| --- | --- | --- | --- | --- |
| Combinational logic |  |  |  |  |
|  |  |  | f |  |
| Clocked digital abstra |  |  |  |  |
|  | ra |  |  |  |

Operational
amplifier abstraction
abstraction
+
-

| Filters |  |
| --- | --- |

| Instruction set abstr |
| --- |

| Analog systemcomponents:Modulators,oscillators, |
| --- |

ction
Pentium, MIPS 6.004

| Programming language |
| --- |

Java, C++, Matlab 6.001

| Software systems 6. |
| --- |

RF amps,
033
power supplies 6.061
Operating systems, Browsers

| Mice, toasters, sonar, stereos, doom, s |
| --- |

ace shuttle
6.455
6.170
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
Lumped Circuit Abstraction
The Big Jump
from physics
to EECS
Consider

![이미지](images/page005_img00.webp)

I

![이미지](images/page005_img01.webp)

| V |  |  |  |  |
| --- | --- | --- | --- | --- |
| V |  |  |  |  |

V
?
Suppose we wish to answer this question:
What is the current through the bulb?
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
We could do it the Hard Way…
Apply Maxwell’s
Differential form Integral form
∂φ
∂B
Faraday’s ∇× E = − ∫ E ⋅ dl = − B
∂t
∂t
∂q
∂ρ
Continuity ∇ ⋅ J = − ∫ J ⋅ dS = −
∂t
∂t
q
ρ
∫ E ⋅ dS =
∇ ⋅ E =
Others
ε
ε
0
0
(cid:122) (cid:122)
(cid:122) (cid:122)
(cid:122) (cid:122)
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
Instead, there is an Easy Way…
First, let us build some insight:
Analogy
F
a ?
I ask you: What is the acceleration?
You quickly ask me: What is the mass?
I tell you: m
F
a =
You respond:
m
Done !!!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
Instead, there is an Easy Way…
First, let us build some insight:
Analogy
F
a ?
In doing so, you ignored
(cid:122) the object’s shape
(cid:122) its temperature
(cid:122) its color
(cid:122) point of force application
Point-mass discretization
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
The Easy Way…

![이미지](images/page009_img00.webp)

Consider the filament of the light bulb.
A
B
We do not care about
(cid:122) how current flows inside the filament
(cid:122) its temperature, shape, orientation, etc.
Then, we can replace the bulb with a
discrete resistor
for the purpose of calculating the current.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
The Easy Way…

![이미지](images/page010_img00.webp)

A
B
Replace the bulb with a
discrete resistor
for the purpose of calculating the current.
A
I
V
+
and I =
R
V
R
–
B
In EE, we do things
the easy way…
R represents the only property of interest!
Like with point-mass: replace objects
F
with their mass m to find a =
m
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
The Easy Way…
A
I
V
+
and I =
R
V
R
–
B
In EE, we do things
the easy way…
R represents the only property of interest!
R relates element v and i
V
I = called element v-i relationship
R
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
R is a lumped element abstraction
for the bulb.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
R is a lumped element abstraction
for the bulb.
Not so fast, though …
I
A
+
S
A
V
S
B
–
B
black box
Although we will take the easy way
using lumped abstractions for the rest
of this course, we must make sure (at
least the first time) that our
abstraction is reasonable. In this case,
ensuring that V I
are defined
for the element
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
I
A
+
S
A V I
V
S must be defined
B
–
B for the element
black box
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
I must be defined. True when
I into S = I out of S
A B
∂q
True only when = 0 in the filament!
∂t
∫ J ⋅dS
S
A
∫ J ⋅dS
S
B
∂q
∫ J ⋅ dS − ∫ J ⋅ dS =
∂t
S S
A B
I I
m A B
o
r
f ell
w
a x ∂q
M
I = I only if = 0
A B
∂t
So let’s assume this
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
V Must also be defined.
see
L
&
A
So let’s assume this too
∂φ
V defined when B = 0
AB
∂t
So V = ∫ E ⋅dl outside elements
AB
AB
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
Lumped Matter Discipline (LMD)
Or self imposed constraints:
∂φ
B = 0 outside
∂t
∂q
= 0 inside elements
More in
∂t
Chapter 1 bulb, wire, battery
of A & L
Lumped circuit abstraction applies when
elements adhere to the lumped matter
discipline.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
Demo
Lumped element examples
whose behavior is completely
only for the
captured by their V–I
sorts of
relationship.
questions we
as EEs would
like to ask!
Demo
Exploding resistor demo
can’t predict that!
Pickle demo
can’t predict light, smell
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
So, what does this buy us?
Replace the differential equations
with simple algebra using lumped
circuit abstraction (LCA).
For example —
a
R R
1 R 4
3
+ b
V d
–
R R
2 5
c
What can we say about voltages in a loop
under the lumped matter discipline?
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
What can we say about voltages in a loop
under LMD?
a
R R
1 R 4
3
+ b
V d
–
R R
2 5
c
∂φ
∫ E ⋅ dl = − B under DMD
∂t
0
∫ E ⋅dl + ∫ E ⋅dl + ∫ E ⋅dl = 0
ca ab bc
+ V + V + V = 0
ca ab bc
Kirchhoff’s Voltage Law (KVL):
The sum of the voltages in a loop is 0.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
What can we say about currents?
Consider
S
I I
ca a da
I
ba
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
What can we say about currents?
S
I I
ca a da
I
ba
∂q
∫ J ⋅ dS = −
under LMD
S ∂t
0
I + I + I = 0
ca da ba
Kirchhoff’s Current Law (KCL):
The sum of the currents into a node is 0.
simply conservation of charge
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
KVL and KCL Summary
KVL:
∑ ν = 0
j j
loop
KCL:
∑ i = 0
j j
node
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 1
CIRCUITS
AND
6.002
ELECTRONICS

| Capacitorsand First-Order Syste |
| --- |
| te as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 12 |

s
Ci ronics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
Motivation
5V
5V
Demo
B
C
A

| 5V0V5A05ExpectBBut05ExpecC Obse0ReadDelay!Chapte as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 12 |  |  |
| --- | --- | --- |
| 0V |  |  |

is, right?
serve this!
d
ed
g:
rs 9 & 10
Ci cs, Spring 2007. MIT
Op ded on [DD Month YYYY].
The Capacitor
D
G
n-channel MOSFET
symbol
S
drain
n s

| +m+e+t+a+l+ | oxide |
| --- | --- |

i
gate l
n-channel
p
i
MOSFET
c
n-channel
o
n n
source
D
G
S
C
GS
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 12
Ideal Linear Capacitor
d
+ + A
+ + + +
EA
- - C =
E
- - - - - d
obeys DMD!
total charge on
capacitor
= +q − q = 0
i
+
q
C v
–
q = C v
coulombs farads volts
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 12
Ideal Linear Capacitor
i
+
q
C v
–
q = C v
dq
i =
dt
( )
d Cv
=
dt
dv
= C
dt
⎡ 1 ⎤
E = Cv2
⎢ ⎥
⎣ 2 ⎦
A capacitor is an energy storage device
(cid:198) memory device (cid:198) history matters!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 12
Analyzing an RC circuit
Thévenin Equivalent:
+
R v ( t )
C
C
( ) + –
v t

| + |  |
| --- | --- |

–
I
Apply node method:
v − v dv
C I + C C = 0
R dt
t ≥ t
dv
0
RC C + v = v
dt C I v ( t ) given
C 0
units
of time
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 12
Let’s do an example:
+
R v ( t )
C C
( ) + –
v t
I –
( )
v t = V
I I
( )
v 0 = V given
C 0
dv
RC C + v = V
X
C I
dt
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 12
Example…
( )
v t = V
I I
( )
v 0 = V given
C 0
dv
RC C + v = V
X
C I
dt
( ) ( ) ( )
v t = v t + v t
C CH CP
total homogeneous particular
Method of homogeneous and particular
solutions:
1 Find the particular solution.
2 Find the homogeneous solution.
3 The total solution is the sum of
the particular and homogeneous
solutions.
Use the initial conditions to solve
for the remaining constants.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 12
1 Particular solution
dv
RC CP + v = V
CP I
dt
v = V works
CP I
dV
RC I +V = V
I I
dt
0
In general, use trial and error.

| v : any solution that satisfiCPoriginal equation X | es the |
| --- | --- |

Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 12
2 Homogeneous solution
dv
RC CH + v = 0
Y
CH
dt
v : solution to the homogeneous
CH
equation
Y
(set drive to zero)
v = Aest
assume solution
CH
of this form. A, s ?
dAest
RC + Aest = 0
dt
RCA s est + Ae st = 0
Discard trivial A = 0 solution,
RC s +1 = 0 Characteristic equation
1
s = −
RC
RC
−t
or v = AeRC
called time
CH
τ
constant
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 12
3 Total solution
v = v + v
C CP CH
−t
v = V + AeRC
C I
Find remaining unknown from initial
conditions:
Given, v = V at t = 0
C 0
so, V = V + A
0 I
or A = V −V
0 I
−t
( )
thus v = V + V −V eRC
C I 0 I
( ) −t
dv V −V
also i = C C = − 0 I eRC
C
dt R
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 12
−t
( )
v = V + V −V eRC
C I 0 I
v
C

| VIV00RCte as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 12 | VI |  |
| --- | --- | --- |

t
Ci ronics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
Examples
v v
C C
5V 5V
−t −t
5 + 5eRC 5eRC

| 0V t 0VV = 0V 5 V = 5VO OV = 5V V = 0V0I Iτ= RCRememberBdemote as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 12 |  |
| --- | --- |

t
5
0
Ci ronics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
CIRCUITS
AND
6.002
ELECTRONICS
State and Memory
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
Review
Recall
R +
v + C v
I – C
–
v = V for t ≥ 0 v ( 0 )
I I C
−t
( ( ) )
v = V + v 0 −V eRC 1
C I C I
Reading: Sections 10.3, 10.5, and 10.7
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
This lecture will dwell on the
memory property of capacitors.
For the RC circuit in the previous slide
v
v I
I V
I
t
t ≥ 0 0
v
C
V
I
−t
( ( ) )
v = V + v 0 −V eRC
C I C I
( )
v 0
C
t
0
t ≥ 0
Notice that the capacitor voltage for is
independent of the form of the input voltage
before t = 0 . Instead, it depends only on the
capacitor voltage at t = 0 , and the input voltage
t ≥ 0
for .
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
State
State : summary of past inputs relevant
to predicting the future
q = C V
for linear capacitors,
capacitor voltage V
is also state variable
state variable, actually
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
State
Back to our simple RC circuit 1
( ( ) ( ))
v = f v 0 ,v t
C C I
−t
( ( ) )
v = V + v 0 −V eRC
C I C I
Summarizes the past input relevant
to predicting future behavior
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
State
We are often interested in circuit
response for
zero state v (0) = 0
(cid:132)
C
zero input v (t) = 0
(cid:132)
I
Correspondingly,
zero state response or ZSR
(cid:132)
−t
v = V −V eRC 2
C I I
zero input response or ZIR
(cid:132)
−t
v = v ( 0 ) eRC 3
C C
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
One application of STATE
DIGITAL MEMORY
Why memory?
Or, why is combinational logic insufficient?
Examples
Consider adding 6 numbers on your
(cid:132)
calculator
2 + 9 + 6 + 5 + 3 + 8
M+
“Remembering” transient inputs
(cid:132)
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
Memory Abstraction
A 1-bit memory element
The
6.004 $
d view
IN
M
store
The
d NEC ¥
OUT View
☺
Remembers input when store goes high.
Like a camera that records input (d ) when the
IN
user presses the shutter release button.
The recorded value is visible at d .
OUT
d
IN
store
d
remembers the 1
OUT
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
Building a memory element …
A First attempt
d d
IN * OUT
storage
C node
store
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
Building a memory element …
A
v
d d
C
IN * OUT
store = 1
C
v
d d
C
IN * OUT
store = 0
C
v
R
C
L
5V
V
Stored value leaks away
OH
t
−t T
R C
v = 5⋅e L from 2
C
V
T = −R C ln OH
L
5
store pulse width >> R C
ON
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
Building a memory element …
B Second attempt (cid:198) buffer
d d
*
IN OUT
R
C IN
buffer
store
Input resistance R
IN
V
T = −R C ln OH
IN
5
R >> R
IN L
Better, but still not perfect.
Demo
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
Building a memory element …
C Third attempt (cid:198) buffer + refresh
store
d d
*
IN OUT
C
store
Does this work?
No. External value can
influence storage node.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
Building a memory element …
D Fourth attempt (cid:198) buffer + decoupled
refresh
store
d d
IN * OUT
C
store
Works!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
A Memory Array
IN

|  | memory |  |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 00 |  |  | A |  | S | d M d | IN OUT |  |
| 00 |  |  | A |  | S | d M d | IN OUT |  |
| 00 |  |  | A |  | S | dMd | IN |  |
|  |  |  | B |  |  | d d | OUT IN |  |
|  |  |  |  |  |  | d | OUT |  |
| 01 |  |  | B |  | S | d M d | INOUT |  |
| 01 |  |  | B |  | S | d M d | IN OUT |  |
| 01 |  |  | B |  | S | dMd | IN |  |
|  |  |  |  |  |  | d d | OUT IN |  |
|  |  |  |  |  |  | d | OUT |  |
| 10 |  |  | C |  | S | d M d | INOUT |  |
| 10 |  |  | C |  | S | d M d | IN OUT |  |
| 10 |  |  | C |  | S | dMd | IN |  |
|  |  |  | D |  |  | d d | OUT IN |  |
|  |  |  |  |  |  | d | OUT |  |
| 11 |  |  | D |  | S | d M d | INOUT |  |
| 11 and | IN Jeffrey (http://ocw.mit.edu/), | store Lang, | D | urse materials forssachusetts Instit | S 6.002 of | d M d of | IN OUT Circuits and Technology. |  |
| 11 |  |  | D |  | S | dMd | IN |  |
| and | NJeffreyw.mit. | stoLanedu/ | store | course materials for Massachusetts Institute | 6.002 of | d of | OUT Circuits and Technology. |  |
| and | IN Jeffrey (http://ocw.mit.edu/), | store Lang, | reg, co), Ma | course materials for Massachusetts Institute | 6.002 of | d of | OUT Circuits and Technology. |  |
| and | IN Jeffrey (http://ocw.mit.edu/), | store Lang, | store | course materials for Massachusetts Institute | 6.00ute | 2 Cof Te | Circuits and Technology. |  |
| and | IN Jeffrey (http://ocw.mit.edu/), | store Lang, | store | course materials for Massachusetts Institute | 6.002 of | of | ircuits andchnology. | EleDo |
| all | 200 | 0 |  | Lecture |  | 14 |  |  |

4-bit
OUT
Decod
A
a a
0 1 2
Address
B
OUT
D
Cite as: Anant Agarw ctronics, Spring 2007. MIT
OpenCourseWare (ht nloaded on [DD Month YYYY].
6.002 F
Truth table for decoder
a a A B C D
0 1
0 0 1 0 0 0
0 1 0 1 0 0
1 0 0 0 1 0
1 1 0 0 0 1
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
Agarwal’s top 10 list on memory
10 I have no recollection, Senator.
9 I forgot the homework was due today.
8 Adlibbing ≡ ZSR
7 I think, therefore I am.
6 I think that was right.
5 I forgot the rest …
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 14
CIRCUITS
AND
6.002
ELECTRONICS
Second-Order Systems
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
Second-Order Systems
5V 5V
Demo
50Ω
2KΩ 2KΩ
S
C
A
B
+ large
–
C
loop
GS
Our old friend, the inverter, driving another.
The parasitic inductance of the wire and
the gate-to-source capacitance of the
MOSFET are shown
[Review complex algebra appendix for next class]
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
Second-Order Systems
5V 5V
Demo
50Ω
2KΩ 2KΩ
S
C
A
B
+ large
–
C
loop
GS
Relevant circuit:
2KΩ L
B
+
5V C
–
GS
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
Observed Output 2kΩ
5
v
A
0 t

| v B | 2kΩ |  |
| --- | --- | --- |
| v C |  |  |
| Now, let’s try to closing the switch resistance Anant Agarwal and Jeffrey Lang, course OpenCourseWare (http://ocw.mit.edu/), | peed up ourS to lowerse materials for 6.002sachusetts Institute of | invertthe efCircuits andTechnology. |
| 002 Fall 2000 | Lecture 1 | 5 |

t
t
er by
ective
Cite as: lectronics, Spring 2007. MIT
OpenCo ownloaded on [DD Month YYYY].
6.0
Observed Output ~50Ω
5
v
A
0 t

|  | 50Ω |
| --- | --- |

v
B
0 t
v
C
0 t
Huh!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
First, let’s analyze the LC network
i(t)
L +
+ v(t)
C
v (t) –
–
I
Node method:
dv
i(t) = C
Recall
dt
di
v − v = L
1 t dv
I
dt
∫ (v − v) dt = C
I
L dt
−∞ 1 t
∫ (v − v) dt = i
I
L
1 d 2v −∞
(v − v) = C
L I dt2
d 2v
LC + v = v
dt2 I
v, i state variables
time2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
Solving
Recall, the method of homogeneous and
particular solutions:
1 Find the particular solution.
2 Find the homogeneous solution.
(cid:76)
4 steps
3 The total solution is the sum of the
particular and homogeneous.
Use initial conditions to solve for the
remaining constants.
( ) ( )
v = v t + v t
P H
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
Let’s solve
d 2v
LC + v = v
dt2 I
For input
v
I
V
0
t
0
And for initial conditions
v(0) = 0 i(0) = 0 [ZSR]
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
1 Particular solution
d 2v
LC P + v = V
dt2 P 0
v = V is a solution.
P 0
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
2 Homogeneous solution
Solution to
d 2v
LC H + v = 0
dt2 H
Recall, v : solution to homogeneous
H
equation (drive set to zero)
Four-step method:
A Assume solution of the form *
v = Aest , A, s = ?
H
so, LCAs2est + Aest = 0
1
characteristic
s2
= −
B
equation
LC
1
s = ± j j = −1
LC
1
C Roots s = ± jω ω =
o o LC
General solution,
jωt − jωt
D v = A e o + A e o
H 1 2
*Differential equations are commonly
solved by guessing solutions
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
3 Total solution
v(t) = v (t) + v (t)
P H
jωt − jωt
v( t ) = V + A e + A e
o o
0 1 2
Find unknowns from initial conditions.
v(0) = 0
0 = V + A + A
0 1 2
i(0) = 0
dv
i(t) = C
dt
jωt − jωt
i( t ) = CA jωe − CA jωe
o o
1 o 2 o
so, 0 = CA jω − CA jω
1 o 2 o
or, A = A
1 2
−V = 2A
0
V
A = − 0
1
2
V
( )
so, v( t ) = V − 0 e jω o t + e − jω o t
0
2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
3 Total solution
Remember Euler relation
e jx = cos x + j sin x
(verify using Taylor’s
expansion)
e jx + e− jx
= cos x
2
so, v( t ) = V −V cosωt where
0 0 o
1
ω =
o
i( t ) = CV ω sinωt LC
0 o o
The output looks sinusoidal
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
Plotting the Total Solution
v(t)
2V

|  | 0 |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- |
|  | 0 0 | i(t) | π 2 | π | 3π 2 | 3π 2 | 2π |
|  |  | i(t) | π2 | π | 3 | π2 | 2π |
|  |  | i(t) | 2 |  |  | 2 |  |
| 0 | 0 o |  |  |  |  |  |  |
|  |  |  | π2 | π |  | 3π2 | 2π |
| 0 as: Anant OpenCourseWare | 0 o Agarwal | and Jeffrey//ocw.mit.e | Lang, courdu/), Mass | se materials for 6.0achusetts Institute | 02of | Circuits andTechnology. | Electronics, Spring Downloaded on [DD |
| .002 | Fa | ll 200 | 0 | Lecture | 1 | 5 |  |

t
o
ωt
o
−
Cite as 007. MIT
OpenC Month YYYY].
6.
Summary of Method
1 Write DE for circuit by applying
node method.
2 Find particular solution v by guessing
P
and trial & error.
3 Find homogeneous solution v
H
A Assume solution of the form Aest .
B Obtain characteristic equation.
C Solve characteristic equation
for roots s .
i
D Form v by summing A es t
i
H i
terms.
4 Total solution is v + v ,
P H
solve for remaining constants using
initial conditions.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
Example
What if we have:
i +
C v (0) = V
L C v C
C
– i (0) = 0
C
We can obtain the answer directly from
the homogeneous solution (V = 0).
0
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
Example
i +
C v (0) = V
L C v C
C
– i (0) = 0
C
We can obtain the answer directly from
the homogeneous solution (V = 0).
0
jωt − jωt
v ( t ) = A e + A e
o o
C 1 2
v (0) = V
C
V = A + A
1 2
i (0) = 0
C
0 = CA jω − CA jω
1 o 2 o
V
or A = A =
1 2
2
V
( )
jωt − jωt
or v = e o + e o
C
2
v = V cosωt
C o
i = −CV ω sinωt
C o o
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
Example
v
C
V
ωt
o
2π
i
CVω
C
o
ωt
o
2π
− CVω
o
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
Energy
E
C
1
CV 2
1
2 2
C : Cv
C
2
ωt
o
2π
E
L
1
1 CV 2
2
L : Li
2
C
2
ωt
o
2π
1 1 1
Notice Cv 2 + Li 2 = CV 2
C C
2 2 2
Total energy in the system is a constant,
but it sloshes back and forth between the
Capacitor and the inductor
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
RLC Circuits
R L
i(t)
+
+
v (t) C v(t)
–
I
–
v(t)
no R
add R
t
Damped sinusoids with R – remember demo!
See A&L Section 12.2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 15
CIRCUITS
AND
6.002
ELECTRONICS
Damped Second-Order
Systems
6.002 Fall 03
1
Damped Second-Order Systems
5V 5V
50Ω
2KΩ 2KΩ
S
C
A
B
+ large
–
C
loop
GS
Remember this Demo
Our old friend, the inverter, driving another.
The parasitic inductance of the wire and
the gate-to-source capacitance of the
MOSFET are shown
[Review complex algebra appendix in Agarwal & Lang
for next class]
6.002 Fall 03
2
Damped Second-Order Systems
5V 5V
50Ω
2KΩ 2KΩ
S
C
A
B
+ large
–
C
loop
GS
Relevant circuit:
2KΩ L
B
+
5V C
–
GS
6.002 Fall 03
3
Observed Output 2kΩ
5
v
A
0 t
v
B
2kΩ
0 t
v
C
0 t
Now, let’s try to speed up our inverter by
closing the switch S to lower the effective
resistance
6.002 Fall 03
4
Observed Output ~50Ω
5
v
A
0 t
v
B
50Ω
0 t
v
C
0 t
Huh!
6.002 Fall 03
5
In the last lecture, we started by
analyzing the simpler LC circuit to
build intuition
i(t)
L +
+ v(t)
C
v (t) –
–
I
6.002 Fall 03
6
In the last lecture…
We solved
d 2v 1 1
+ v = v
dt2 LC LC I
For input
v
I
V
I
t
0
And for initial conditions
v(0) = 0 i(0) = 0 [ZSR]
6.002 Fall 03
7
In the last lecture…
Total solution
v(t) =V −V cosω t
where
I I o
1
ω =
o
LC
v(t)
2V
I
LC
V
v
I
I
0
t
i(t)
L +
+ v(t)
C
v (t) –
–
I
6.002 Fall 03
8
Today, we will close the loop on our
observations in the demo by
analyzing the RLC circuit
R L
i(t)
+
+
v (t) C v(t)
–
I
–
v(t)
2V
I
LC
V
v
I
I add R
0
t
Damped sinusoids with R – remember demo!
See A&L Section 13.6
6.002 Fall 03
9
Let’s analyze the RLC network
v
A
i(t)
v (t) L R +
I
+ v(t)
C
–
–
Node method:
Recall
1 t v − v
v : ∫ (v − v ) dt = A element rules
A I A
L R
−∞
v − v dv L:
v : A = C di
R dt v = L
L
dt
t
1
∫ v dt = i
L
L
−∞
d 2v R dv 1 1
+ + v = v C:
dv
dt2 L dt LC LC I
i = C C
C
dt
v, i state variables
6.002 Fall 03
10
Let’s analyze the RLC network
v
A
i(t)
L R +
v (t)
+ v(t)
C
I
–
–
Node method:
1 t v − v
v : ∫ (v − v ) dt = A
A I A
L R
−∞
v − v dv
v : A = C
R dt
1 d2v
(v − v ) = C
L I A dt2
1 d2v
(v − v ) =
LC I A dt2
dv
v = RC + v
A
dt
1 dv d2v
(v − RC − v ) =
LC I dt dt2
d2v R dv 1 1
+ + v = v
dt2 L dt LC LC I
6.002 Fall 03
11
Solving
Recall, the method of homogeneous and
particular solutions:
1 Find the particular solution.
2 Find the homogeneous solution.
(cid:76)
4 steps
3 The total solution is the sum of the
particular and homogeneous.
Use initial conditions to solve for the
remaining constants.
( ) ( )
v = v t + v t
P H
6.002 Fall 03
12
Let’s solve
d2v R dv 1 1
+ + v = v
dt2 L dt LC LC I
For input
v
I
V
I
t
0
And for initial conditions
v(0) = 0 i(0) = 0 [ZSR]
6.002 Fall 03
13
1 Particular solution
d 2v R dv 1 1
P + P + v = V
dt2 L dt LC P LC I
v =V
is a solution.
P I
6.002 Fall 03
14
2 Homogeneous solution
d2v R dv 1
Solution to H + H + v = 0
dt2 L dt LC H
Recall, v : solution to homogeneous
H
equation (drive set to zero)
Four-step method:
A Assume solution of the form
v = Aest , A, s = ?
H
B Form the characteristic equation
f(s)
C Find the roots of the characteristic equation
s ,s
1 2
D General solution
s t s t
v = A e + A e
1 2
H 1 2
6.002 Fall 03
15
2 Homogeneous solution
d2v R dv 1
Solution to H + H + v = 0
dt2 L dt LC H
A Assume solution of the form
v = Aest , A, s = ?
H
R 1
so, As2est + Asest + Aest = 0
L LC
R 1 characteristic
B s2 + s + = 0
equation
L LC
1
s2 + 2αs +ω2 = 0 ω =
o o
LC
R
α=
2L
C Roots s = −α+ α2 −ω2
o
1
s = −α− α2 −ω2
o
2
D General solution
⎛ 2 2 ⎞ ⎛ 2 2 ⎞
⎜−α+ α −ω ⎟t ⎜−α− α −ω ⎟t
o o
v = A e⎝ ⎠ + A e⎝ ⎠
H 1 2
6.002 Fall 03
16
3 Total solution
v(t) = v (t) + v (t)
P H
⎛ 2 2 ⎞ ⎛ 2 2 ⎞
⎜−α+ α −ω ⎟t ⎜−α− α −ω ⎟t
o o
v(t) =V + A e⎝ ⎠ + A e⎝ ⎠
I 1 2
Find unknowns from initial conditions.
v(0) = 0 : 0 =V + A + A
I 1 2
i(0) = 0 :
dv
i(t) = C
dt
( )
⎛ 2 2 ⎞
⎜−α+ α −ω ⎟t
= CA −α+ α2 −ω2 e⎝ o ⎠ +
o
1
( )
⎛ 2 2 ⎞
⎜−α− α −ω ⎟t
o
CA −α− α2 −ω2 e⎝ ⎠
o
2
( ) ( )
so, 0 = A −α+ α2 −ω2 + A −α− α2 −ω2
o o
1 2
Mathematically: solve for unknowns,
done.
6.002 Fall 03
17
Let’s stare at this a while longer…
⎛ 2 2 ⎞ ⎛ 2 2 ⎞
⎜ α −ω ⎟t ⎜− α −ω ⎟t
o o
v(t) =V + A e −αt e⎝ ⎠ + A e −αt e⎝ ⎠
I 1 2
3 cases:
α>ω
Overdamped v
V
o I
I
v
−αt −αt
v(t) =V + A e + A e
1 2
I 1 2 t
α<ω
Underdamped
o
⎜ ⎛ j ω 2 −α 2 ⎟ ⎞ t ⎜ ⎛ − j ω 2 −α 2 ⎟ ⎞ t
v(t) =V + A e−αte⎝ o ⎠ + A e−αte⎝ o ⎠
I 1 2
=V + A e−αt e jω t + A e−αt e − jωt ω = ω2 −α2
d d o
d
I 1 2
=V + K e−αt cosωt + K e−αt sinωt ejω d t = cosω d t + jsinω d t
I 1 d 2 d
α=ω
Critically damped
o
Later…
6.002 Fall 03
18
Let’s stare at underdamped a while longer…
α<ω
Underdamped contd…
o
v(t) =V + K e−αt cosωt + K e−αt sinωt
I 1 d 2 d
v(0) = 0 : K = −V
1 I
dv
i(t) = C
i(0) = 0 :
dt
= −CKαe−αt cosωt − CK ωe−αt sinωt
1 d 2 d d
− CKαe−αt sinωt + CK ωe−αt cosωt
1 d 2 d d
0 = −Kα+ K ω
1 2 d
Vα
K = − 1
2
ω
d
α
v(t) =V −V e−αt cosωt −V e−αt sinωt
I I d I d
ω
d
⇒
Note: For R = 0 α= 0
v(t) =V −V cosωt
I I o
Same as LC as expected
6.002 Fall 03
19
Let’s stare at underdamped a while longer…
α<ω
Underdamped contd…
o
α
v(t) =V −V e−αt cosωt −V e−αt sinωt
I I d I d
ω
d
Remember, scaled sum of sines (of the same
frequency) are also sines! -- Appendix B.7
ω ⎛ α ⎞
v(t) =V −V o e−αt cos⎜ωt − tan−1 ⎟
⎜ ⎟
I I d
ω ω
⎝ ⎠
d d
v(t)
2V
I
LC
V
v
I
I add R
0
t
6.002 Fall 03
20
α<ω
Underdamped contd…
o
α
v(t) =V −V e−αt cosωt −V e−αt sinωt
I I d I d
ω
d
Remember, scaled sum of sines (of the same
frequency) are also sines! -- Appendix B.7
ω ⎛ α ⎞
v(t) =V −V o e−αt cos⎜ωt − tan−1 ⎟
⎜ ⎟
I I d
ω ω
⎝ ⎠
d d
v(t)
2V
I
LC
V
v
I
I add R
0
t
underdamped
v
criticallydamped
α=ω
Critically damped
overdamped
o t
Section 13.2.3
6.002 Fall 03
21
Remember this? Closed the
loop…
5
v
A
0 t
v
B
50Ω
0 t
v
C
0 t
See example 12.9 on page 664 of the A&L textbook
for inverter-pair analysis
6.002 Fall 03
22
Intuitive Analysis
See Sec. 12.7 of A&L textbook
ω ⎛ α ⎞
v(t) =V −V o e−αt cos⎜ωt − tan−1 ⎟
Underdamped
⎜ ⎟
I I d
ω ω
⎝ ⎠
d d
v(t)
−αt
e “ringing”
V
I
0
t
2π
ω
d
R 1
Characteristic s2 + s + = 0
L LC
equation
s2 + 2αs +ω2 = 0
o
ω : Oscillation frequency ω = ω2 −α2
d d o
α:
Governs rate of decay
V :
Final value
I
v(0) :
Initial value
ω
Q = o : Quality factor (approximately
2α
the number of cycles of ringing)
6.002 Fall 03
23
Intuitive Analysis
See Sec. 12.7
of A&L textbook
Ringing stops
v(t) after Q cycles V
I
V
I
?
v(0)
i(0) 0 t
2π
period
ω
is –ve
d
so v(t)
R 1
must Characteristic s2 + s + = 0
L LC
drop equation
s2 + 2αs +ω2 = 0
o
ω = ω2 −α2
o
i(t) d
ω
Q = o
2α
L
R +
v +
C v(t)
given
–
I
–
i(0) -ve
v(0)
+ve
6.002 Fall 03
24
CIRCUITS
AND
6.002
ELECTRONICS

| Sinusoidal Steady S |
| --- |
| ite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Dow6.002 Fall 2000 Lecture 16 |

tate
Ci ronics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
Review
(cid:132) We now understand the why of:
5V v
R
L
C
(cid:132)Today, look at response of networks
to sinusoidal drive.
Sinusoids important because signals can be
represented as a sum of sinusoids. Response to
sinusoids of various frequencies -- aka frequency
response -- tells us a lot about the system
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Motivation
For motivation, consider our old friend,
the amplifier:
V
S
Demo
v
O
R v
C
+
v
–
i
C
GS
+
V
–
BIAS
Observe v amplitude as the frequency of the
o
input v changes. Notice it decreases with
i
frequency.
Also observe v shift as frequency changes
o
(phase).
Need to study behavior of networks for
sinusoidal drive.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Sinusoidal Response of RC Network
Example:
i
R C
+
+
v v
–
I C
–
v (t) = V cosωt for t ≥ 0 (V real)
I i i
= 0 for t < 0
v (0) = 0 for t = 0
C
v
I
t
0
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Our Approach
Example:
i
R C
+
+
v v
–
I C
–
Determine v (t)
C
me!
troffE
Indulge
Usual
approach
agony
aky approach
very
sneaky
easy
t
e
0 0 0 e
r
0 2 0 r
u
1 : 1 : 2 : t u
t c
1 1 1 c
e
e
l
l
s
t
i
h
x
T
e
N
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Let’s use the usual approach…
1 Set up DE.
2 Find v .
p
3 Find v .
H
4 v = v + v , solve for unknowns
C P H
using initial conditions
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Usual approach…
1 Set up DE
dv
RC C + v = v
C I
dt
= V cosωt
i
That was easy!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
2 Find v
p
dv
RC P + v = V cosωt
P i
dt
First try: v = A (cid:198) nope
P
Second try: v = Acosωt (cid:198) nope
P
v = Acos(ωt +φ)
Third try:
P frequency
amplitude phase
− RCAωsin(ωt +φ) + Acos(ωt +φ) = V cosωt
i
− RCAωsinωt cosφ− RCAωcosωt sinφ+
Acosωt cosφ− Asinωt sinφ = V cosωt
i
.
.
.
gasp !
works, but trig nightmare!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Let’s get sneaky!
Find particular solution to another input…
dv
RC PS + v = v ( : sneaky :-))
S
PS IS
dt
= V est
i
v = V est
Try solution
Nice
PS p
dV est property
RC p +V est = V est of
p i
dt
exponentials
sRCV est +V est = V est
p p i
( sRC + 1)V = V
p i

| VV = ip1+ sRC |  |
| --- | --- |

V
Thus, v = i ⋅est
PS
1+ sRC easy!
is particular solution to V est
i
V
ly i ⋅e jωt V e jωt
solution for
1+ jωRC i
s = jω
where we replace
V complex amplitude
p
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
2 Fourth try to find v …
P
using the sneaky approach
Fact 1: Finding the response to
V e jωt
i
was easy.
Fact 2: v = V cosωt
I i
[ ]
= real V e jωt = real [ v ]
i IS
from Euler relation,
e jωt = cosωt + j sinωt
v response v
real I P real
part part
response
v v
IS PS
an inverse superposition argument,
assuming system is real, linear.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
2 Fourth try to find v …
P
so, complex
[ ]
v = Re [ v ] = Re V e jωt
P PS p
⎡ V ⎤
= Re i ⋅e jωt
⎢ ⎥
1+ jωRC
⎣ ⎦
V (1− jωRC)
⎡ ⎤
= Re i ⋅e jωt
⎢ 1+ω2R2C2 ⎥
⎦
⎣
⎡ V ⎤
= Re i ⋅e jφe jωt ,tanφ= −ωRC
⎢ ⎥
1+ω2R2C2
⎣
⎦
⎡ V ⎤
= Re i ⋅e j(ωt+φ)
⎢ ⎥
1+ω2R2C2
⎦
⎣
V
v = i ⋅cos(ωt +φ)
P
1+ω 2R2C2
Recall, v is particular response to V cosωt .
P i
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
3 Find v
H
−t
Recall, v = AeRC
H
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
4 Find total solution
v = v + v
C P H
t
V
−
v = i cos(ωt +φ)+ Ae RC
C
1+ω 2R2C2
where φ= tan−1( −ωRC )
Given v (0) = 0 for t = 0
C
so,
V
A = − i cos(φ)
1+ω2R2C2
Done! Phew !
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Sinusoidal Steady State
We are usually interested only in the
particular solution for sinusoids,
i.e. after transients have died.
t
−
Notice when t → ∞ , v → v as e RC → 0
C P
0
t
V
−
v = i cos(ωt +φ)+ Ae RC
C
1+ω 2R2C2
where φ= tan−1( −ωRC )
V
A = − i cos(φ)
1+ω2R2C2
V
p ∠V
p
Described as

| SSS: Sinusoidal Stead | y State |
| --- | --- |

Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Sinusoidal Steady State
All information about SSS is contained
in V , the complex amplitude!
p

| Vi |
| --- |
| V =p1+ jωRC |

Steps 3 , 4
Recall
were a waste of
time!
V 1
p
=
V 1+ jωRC
i
V 1
p = e jφ where
V 1+ω 2R2C2
i
φ= tan−1 −ωRC
V 1
p
=
magnitude
V 1+ω 2R2C2
i
V
phaseφ: ∠ p = − tan−1 ωRC
V
i
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Sinusoidal Steady State
Visualizing the process of finding the
particular solution v
P
V cosωt
D.E. [ ]
i
V cosωt + ∠V
drive p p
+
nightmare
particular
trig.
solution
algebraic
sneak

| takreapar | elt |
| --- | --- |

equation
in
+
V e jωt
i
complex
drive
algebra V e jωt
p
the sneaky path!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Magnitude Plot
transfer function
V V 1
H ( jω) = p p =
V V 1+ω 2R2C2
i i
V
p
1
V
i
log
scale
ω
1
log
ω=
RC
scale
From demo: explains v fall off
o
for high frequencies!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 16
Phase Plot
φ= tan−1 −ωRC
V
p
φ= ∠
V

| i1ω=RC0lπ−4π−2ite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Dow6.002 Fall 2000 Lecture 16 | 1ω=RC |  |
| --- | --- | --- |
|  |  | l |

ω
g scale
Ci ronics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
CIRCUITS
AND
6.002
ELECTRONICS
The Impedance Model
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
Review
(cid:132) Sinusoidal Steady State (SSS)
Reading 13.1, 13.2
R
+
+
v = V cosωt C v
–
I i O
–
(cid:132) Focus on steady state, only care
about v as v dies away.
SSS
P H
(cid:132) Focus on sinusoids.
(cid:132) Sinusoidal Steady State (SSS)
Reading 13.1, 13.2
Reading: Section 13.3 from course notes.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
v
Review P
[ ]
V cosωt V cosωt + ∠V
1
i p p

| usual |
| --- |
| circuitmodel |

| set |
| --- |
| upDE |

| nightmare |
| --- |
| trig. |

3
V
p v
H
2
sneak
take 4
in complex
total
real
V e jωt algebra
i
part
drive
The Sneaky Path
V e jωt
p
V
i
1+ jωRC
V contains all the information we need:
p
V
Amplitude of output cosine
p
∠V phase
p
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
Review ( )
v = V cos ωt + ∠V
O p p
V 1
transfer
p = = H( jω)
V 1+ jωRC function
i
V
p remember
1
V demo
i
1
2
1
1
1+ω2R2C2
ωRC
ω
1
ω=
RC
Bode plot break frequency
V 1
∠ p ω=
RC
V
ω
i
0
⎛−ωRC ⎞ π
tan−1
⎜ ⎟ −
⎝ 1 ⎠ 4
π
−
2
The Frequency View
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
Is there an even simpler way
to get V ?
p
V
V = i
p
1+ jωRC
Divide numerator and denominator by jωC.
1
jωC
V = V
p i 1
+ R
jωC
Hmmm… looks like a voltage divider
relationship.
Z
V = V C
p i
Z + R
C
Let’s explore further…
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
The Impedance Model
Is there an even simpler way to get V ?
p
Consider:
i i = I e jωt v = Ri
+ R R r R R
v R v = V e jωt V e jωt = RI e jωt
R R r r r
–
Resistor V = RI
r r
dv
i = I e jωt i = C C
i
C C C
dt
+ C
v C v = V e jωt I e jωt = CV jωe jωt
C
C C C C
–
1
Capacitor V = I
C C
jωC
Z
C
di
i = I e jωt v = L L
i
L l L
+ L dt
v
L L v = V e jωt V e jωt = LI jωe jωt
– L l l l
Inductor V = jωL I
l l
Z
L
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
The Impedance Model
In other words,
I
V = Z I
c
capacitor c C c
+
1
V Z Z =
c C C
jωC
–
impedance
I
l
inductor
+ V = Z I
l l l
V Z
l L Z = jωL
–
l
I
resistor
r
+ V = Z I
r r r
Z
V
r R Z = R
–
r
For a drive of the form V ejωt ,
c
complex amplitude V is related to the
c
complex amplitude I algebraically,
c
by a generalization of Ohm’s Law.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
Back to RC example…
R
+
+
v v
C
–
I C
–
Impedance model:
Z = R
R
I
c
+
1
+
V
Z =
V
–
i
C
c jωC
–
1
jωC Z
V = V = C V
c 1 i i
Z + Z
+ R C R
jωC
1
Done!
V = V
c i
1+ jωRC
All our old friends apply!
KVL, KCL, superposition…
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
Another example, recall series RLC:
Remember, we want only the steady-state
response to sinusoid
I
r
L
C +
+ V
V R
– r
i
–
V e jωt V e jωt
i r
V cosωt V cos(ωt + ∠V )
i r r
V Z
V = i R
r
Z + Z + Z
L C R
V R
V = i
r 1
jωL + + R
jωC
V jωCR
V = i
r −ω 2LC +1+ jωCR
We will study this and other functions
in more detail in the next lecture.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
The Big Picture…
[ ]
V cosωt V cosωt + ∠V
i p p

| usual |
| --- |
| circuitmodel |

| set |
| --- |
| upDE |

| nightmare |
| --- |
| trig. |

Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
The Big Picture…
[ ]
V cosωt V cosωt + ∠V
i p p

| usual |
| --- |
| circuitmodel |

| set |
| --- |
| upDE |

| ni | ghtmare |
| --- | --- |
|  | trig. |

take
V e jωt complex
i
real
drive algebra
part
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
The Big Picture…
[ ]
V cosωt V cosωt + ∠V
i p p

| usual |
| --- |
| circuitmodel |

| set |
| --- |
| upDE |

| ni | ghtmare |
| --- | --- |
|  | trig. |

take

|  | V e jωtidrive |
| --- | --- |

| c | omplexalgebra |
| --- | --- |

real
part
impedance-based complex
circuit model algebra
No D.E.s, no trig!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
Back to
I
r
V jωRC V L C +
r = i
+ V
R
V 1+ jωRC −ω2LC – r
–
i
Let’s study this transfer function
V jωRC
r =
V 1+ jωRC −ω2LC
i
( )
jωRC 1−ω 2LC − jωRC
= ⋅
( ) ( )
1−ω 2LC + jωRC 1−ω 2LC − jωRC
V ωRC
r =
V ( 1−ω 2LC )2 + ( ωRC )2
i
Observe
Low ω: ≈ωRC
R
High ω: ≈
ωL
ω LC = 1: ≈ 1
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
Graphically
V ωRC
r =
V ( 1−ω 2LC )2 + (ωRC)2
i
Low ω: ≈ωRC
R
High ω: ≈
ωL
ω LC = 1: ≈ 1
V
r
V
i
1 “Band Pass”
R
ωRC
ωL
ω
1
LC
Remember this trick to sketch the form of
transfer functions quickly.
More next week…
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 17
CIRCUITS
AND
6.002
ELECTRONICS
Filters
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
Review
R
+
+
v
C v
–
I
C
–
Z
R
+
+
V
Z V
–
i
C c
–
Z
V = C ⋅V
c i
Z + Z
C R
1
V jωC 1
c = =
1
V 1+ jωRC
i + R
jωC
Reading: Section 14.5, 14.6, 15.3 from A & L.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
A Filter
Z
R
+
+
V
Z V
–
i
C c
–
Z 1
V = C ⋅V =
c i
Z + Z 1+ jωRC
C R
V
( )
H ω = c
V
i
1
“Low Pass Filter”
ω
Demo
with audio
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
Quick Review of Impedances-
Just as
A
+
I
ab
R
V
1
V R = ab = R + R
ab AB 1 2
I
R ab
2
–
B
A
+
I
ab
R
V
1
V Z = ab = R + jωL
ab AB 1
I
jωL ab
–
B
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
Quick Review of Impedances
Similarly
A
Z = R + Z || R + Z
AB 1 C 2 L
R
1
Z R
= R + C 2 + Z
1 L
C R Z + R
2 C 2
R
= R + 2 + jωL
L
1
1+ jωCR
2
B
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
We can build other filters by
combining impedances
Z(ω)
L
Z R
C
ω
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
We can build other filters by
combining impedances
Z(ω)
L
Z R
C
ω
H(ω)
HPF
+
–
High Pass Filter
ω
H(ω)
LPF
+
–
Low Pass Filter
ω
H(ω)
HPF
+
–
ω
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
Check out:
C
L
+
+
V R
V
–
i
r
–
Intuitively:
V
r 1
V
i
freq
L blocks
w
lo
high
blocks
freq
C
ω
1
ω =
o
LC
V R
r = At resonance,
V 1
i jωL + + R ω = ω
jωC o
and
jωRC
=
Z + Z = 0,
1 −ω2LC + jωRC L C
so V sees
i
V ωRC
r = only R!
V ( 1 −ω2LC )2 + ( ωRC )2
i More later…
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
What about:
V
+ lc –
L
C
+
V R
–
i
V
lc
V
i Band Stop Filter
1
C open
L open
ω
Check out V and V in the lab.
l c
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
Another example:
R
+
V + L C V
– o
i
–
V
o
BPF
V
i
C
t s
o r h
h o
s r
L
t
ω
ω
o
Application: see AM radio coming up shortly
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
AM Radio Receiver
antenna
R
demodulator
+
V L C
–
i
amplifier
Thévenin
antenna
model
crystal radio demo
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
AM Receiver
R
demodulator
+
V L C
–
i
amplifier
signal
filter
WBZ
strength
News
10 KHz
Radio
f
540 …1000 1010 1020 1030 … 1600 KHz
“Selectivity” important —
relates to a parameter “Q” for the filter. Next…
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
Selectivity:
Look at series RLC in more detail
C
L
+
+ V
V R
– r
i
–
V R
Recall, r =
V 1
i R + jωL +
jωC
V
r
V
i
1

| Δband |
| --- |

higher Q
1
2
idth
ω
ω
o
ω
Define Q = o quality factor
Δω
high Q ⇒
more selective
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
Quality Factor Q
ω
Q = o
Δω
ω:
ο
V R 1
r
= =
V 1 ⎛ L 1 ⎞
i R + jωL + 1+ j ω −
⎜ ⎟
jωC ⎝ R ωCR ⎠
at ω =0
ο
1
ω =
o
LC
Δω?
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
Quality Factor Q
ω
Q = o
Δω
Δω:
1
Note that abs magnitude is
2
V 1 1
r = =
when
V ⎛ L 1 ⎞ 1 ± j1
i 1 + j⎜ω − ⎟
R ωCR
⎝ ⎠
ωL 1
− = ±1
i.e. when
R ωCR
ωR 1
ω2 ∓ − = 0
L LC
Looking at the roots of both equations,
R 1 R2 4 R 1 R2 4
ω = + + ω = − + +
1 2L 2 L2 LC 2 2L 2 L2 LC
R
Δω=ω −ω =
1 2
L
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
Quality Factor Q
ω
Q = o
Δω
1
ω ω L
ω =
Q = o = o
o
R LC
R
L
The lower the R (for series R),
the sharper the peak
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
Quality Factor Q
Another way of looking at Q :
energy stored
Q = 2π
energy lost per cycle
1
2
L I
r
2
= 2π
1 2π
2
I R
r
2 ω
0
ω L
Q = o
R
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 18
CIRCUITS
AND
6.002
ELECTRONICS
The Operational Amplifier
Abstraction
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Review
(cid:132) MOSFET amplifier — 3 ports
+
power
V
+ S
port
output
v
+
O
port
input
v –
I
port
– –
(cid:132) Amplifier abstraction
V
S
+
v v
+ + I O
v v
I – – – O
v
Function of
I
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Review
v v
I O
v
Function of
I
(cid:132) Can use as an abstract building block for
more complex circuits (of course, need
to be careful about input and output).
(cid:132) Today
Introduce a more powerful amplifier
abstraction and use it to build more
complex circuits.
Reading: Chapter 15 from A & L.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Operational Amplifier
Op Amp
V
S
power
+
–
port
+
input
port output
–
port
+
–
−V
S
More abstract representation:
+
+
v
v
IN
– – OUT
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Circuit model (ideal):
v
+ O
i = 0
+
v
+
+
v
Av
–
– –
v
A → ∞
–
i = 0
i.e. (cid:141) ∞ input resistance
(cid:141) 0 output resistance
(cid:141) “A” virtually ∞
(cid:141) No saturation
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Using it…
+
12V – V =12V
S
v
+
O
v
IN
–
R
−V = −12V
L
S
–
12V +
Demo
active region
v
O
12V
saturation
v
IN
−10 μV 10μV
A ~106
−12V
but unreliable,
temp. dependent
(Note: possible confusion with MOSFET saturation!)
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Let us build a circuit…
Circuit: noninverting amplifier
v+
+
v
v−
O
+ –
v
– R
IN
1
R
2
Equivalent circuit model
mp
a
op
+
i = 0
v+ v
O
+ ( )
v + A v+ − v−
IN – – R
v− 1
–
i = 0
R
2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Let us analyze the circuit:
Find v in terms of v , etc.
O IN
( )
v = A v+ − v−
O
⎛ R ⎞
= A⎜v − v 2 ⎟
IN O
R + R
⎝ ⎠
1 2
⎛ AR ⎞
v ⎜1+ 2 ⎟ = Av
O IN
R + R
⎝ ⎠
1 2
Av
v = IN
O AR
1+ 2
R + R
1 2
What happens when “A” is very large?
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Let’s see… When A is large
Av Av
v = IN ≈ IN
O AR AR
1+ 2 2
R + R R + R
1 2 1 2
( )
R + R
≈ v 1 2
IN
R
2
Suppose A = 106
gain
R = 9R
1
R = R
2
106 ⋅v
v = IN
O 106 R
1+
9R + R
106 ⋅v
= IN
Demo
1
1+ 106 ⋅
10
v ≈ v ⋅10
O IN
Gain:
(cid:132) determined by resistor ratio
(cid:132) insensitive to A, temperature, fab variations
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Why did this happen?
Insight:
5V
v+
12V
10V
+
A v = 2v
v−
O IN
+ 5V –
v
– R
IN
6V
6V
v
O
–
i = 0 2
negative
feedback R
e.g. v = 5V
IN
Suppose I perturb the circuit…
(e.g., force v momentarily to 12V somehow).
O
-
Stable point is when v+ ≈ v .
Key: negative feedback (cid:198) portion of
output fed to –ve input.
e.g. Car antilock brakes
(cid:198) small corrections.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Question: How to control a
high-strung device?
Antilock brakes
is it
turning?
yes/no
k
c
a
d b it’s
e
e
f
all about
Michelin control
no
yes

![이미지](images/page155_img00.webp)

apply
release
c
s
i
d
v. v. powerful brakes
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
More op amp insights:
Observe, under negative feedback,
⎛ R + R ⎞
⎜ 1 2 ⎟v
IN
v R
⎝ ⎠
v+ − v− = O = 1 → 0
A A
v+ ≈ v−
We also know
i+ ≈ 0
i - ≈ 0
(cid:198)yields an easier analysis method
(under negative feedback).
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Insightful analysis method
under negative feedback
v+ ≈ v−
i+ ≈ 0
i− ≈ 0
R + R
g v = v 1 2
a v O IN
R
IN
2
+
v
v O
b
+ IN –
v
v
– R
IN
IN
1 f
c v
R
IN
2
i = 0
e
v
IN
R
d
R 2
2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Question:
a v v+
IN
+ c v
IN
v ?
v− O
+ –
v v
– b
IN IN
v ≈ v
O IN
R + R
or v = v 1 2
O IN
R
2
with R = 0
1
R = ∞
2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
Why is this circuit useful?
+
v
O
+ –
v
–
IN
v ≈ v
O IN
Buffer
voltage gain = 1
input impedance = ∞
output impedance = 0
current gain = ∞
power gain = ∞
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 19
CIRCUITS
AND
6.002
ELECTRONICS
Basic Circuit Analysis Method
(KVL and KCL method)
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2

|  | Review |  |
| --- | --- | --- |

Lumped Matter Discipline LMD:
Constraints we impose on ourselves to simplify
our analysis
∂φ
B = 0 Outside elements
∂t
∂q
Inside elements
= 0
∂t
wires resistors sources
Allows us to create the lumped circuit
abstraction
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2

|  | Review |  |
| --- | --- | --- |

LMD allows us to create the
lumped circuit abstraction
i
+
Lumped circuit element
v
-
vi
power consumed by element =
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2

| e | Reviewview |  |
| --- | --- | --- |

R
Maxwell’s equations simplify to
algebraic KVL and KCL under LMD!
KVL:
∑ ν = 0
j j
loop
KCL:
∑ i = 0
j j
node
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Review
a
R R
1 4
R
b 3
+
d
–
R R
2 5
c
v + v + v = 0
KVL
ca ab bc
DEMO
i + i + i = 0
KCL
ca da ba
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Method 1: Basic KVL, KCL method of
Circuit analysis
Goal: Find all element v’s and i’s
1. write element v-i relationships
(from lumped circuit abstraction)
2. write KCL for all nodes
3. write KVL for all loops
lots of unknowns
lots of equations
lots of fun
solve
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Method 1: Basic KVL, KCL method of
Circuit analysis
Element Relationships
R
For R, V = IR
For voltage source, V = V + –
0
V
0
For current source, I = I (cid:74)
0
I
o
3 lumped circuit elements
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
KVL, KCL Example
a
+ +
ν R ν R
1 1 4 4
– –
R
3
+ + b
d
ν = V –
ν
0 0 + –
– 3
+
+
ν
R ν R
2
– 2 5 5
–
c
The Demo Circuit
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Associated variables discipline
i
+
ν Element e
-
Current is taken to be positive going
into the positive voltage terminal
Then power consumed
=νi is positive
by element e
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
KVL, KCL Example
a
i
i
4
L2
+ 1 +
ν R ν R
1 1 4 4
i – –
R
0
L1 i 3
+ + b
3 d
ν = V –
ν
0 0 i + –
i
– 3
+ 2 5
+
ν
R ν R
2
– 2 5 5
L3
–
c
L4
The Demo Circuit
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Analyze
ν …ν ,ι …ι
12 unknowns
0 5 0 5
( )
1. Element relationships v,i
v = V v = i R
given 6 equations
0 0 3 3 3
v = i R v = i R
1 1 1 4 4 4
v = i R v = i R
2 2 2 5 5 5
2. KCL at the nodes
i + i + i = 0
3 independent
a:
0 1 4
i + i − i = 0
b: equations
2 3 1
i − i − i = 0
d:
5 3 4
− i − i − i = 0
e: redundant
0 2 5
3. KVL for loops
− v + v + v = 0
L1: 3 independent
0 1 2
v + v − v = 0 equations
L2:
1 3 4
v + v − v = 0 s
L3: n
3 5 2 o
i
− v + v + v = 0 a t n s
L4: redundant u w

![이미지](images/page170_img00.webp)

0 4 5 q n o
e n k
u
2 2
1 1

![이미지](images/page170_img02.webp)

![이미지](images/page170_img01.webp)

![이미지](images/page170_img04.webp)

![이미지](images/page170_img03.webp)

(cid:47)
ugh
@#!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Other Analysis Methods
Method 2— Apply element combination rules
R + R +(cid:34)+ R
R R R R
1 2 N
1 2 3 N
…
⇔
A
B
G G G ⇔ G + G (cid:34)+ G
1 2 N 1 2 N
1
G =
i
R
i
V V V +V
1 2 1 2
C ⇔
+ – + – + –
D
(cid:74) (cid:74) I I I + I
⇔
(cid:74)
1 2 1 2
Surprisingly, these rules (along with superposition, which
you will learn about later) can solve the circuit on page 8
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Other Analysis Methods
Method 2— Apply element combination rules
I = ?
Example
+ R
V
– 1
R R
2 3
I I
R
+ 1 +
V V
– – R
R R
2 3
R + R
2 3
R R
R = R + 2 3
1
R + R
2 3
V
I =
R
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Method 3—Node analysis
Particular application of KVL, KCL method
1. Select reference node ( ground)
from which voltages are measured.
2. Label voltages of remaining nodes
with respect to ground.
These are the primary unknowns.
3. Write KCL for all but the ground
node, substituting device laws and
KVL.
4. Solve for node voltages.
5. Back solve for branch voltages and
currents (i.e., the secondary unknowns)
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Example: Old Faithful
plus current source
V
0

| eV10 |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |

R
4
e
+ 2
–
R
(cid:74)
I
5
1
Step 1
Step 2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Example: Old Faithful
plus current source
V
0

| eV10 |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |

R
4
e
+ 2
–
for
R
(cid:74)
I
5 convenience,
1
write
1
G =
i
R
i
KCL at e
1
(e −V )G + (e − e )G + (e )G = 0
1 0 1 1 2 3 1 2
KCL at e
2
(e − e )G + (e −V )G + (e )G − I = 0
2 1 3 2 0 4 2 5 1
Step 3
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Example: Old Faithful
plus current source
V
0

| eV10 |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- |

R
4
e
+ 2
–
R
(cid:74)
I
5
1
1
G =
i
R
i
KCL at e
1
(e −V )G + (e − e )G + (e )G = 0
1 0 1 1 2 3 1 2
KCL at l
2
(e − e )G + (e −V )G + (e )G − I = 0
2 1 3 2 0 4 2 5 1
move constant terms to RHS & collect unknowns
e (G + G + G ) + e (−G ) = V (G )
1 1 2 3 2 3 0 1
e (−G ) + e (G + G + G ) = V (G ) + I
1 3 2 3 4 5 0 4 1
2 equations, 2 unknowns Solve for e’s
(compare units)
Step 4
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
In matrix form:
⎡G +G +G −G ⎤ ⎡e ⎤ ⎡ GV ⎤
1 2 3 3 1 = 1 0
⎢ ⎥ ⎢ ⎥ ⎢ ⎥
−G G +G +G e G V + I
⎣ ⎦ ⎣ ⎦ ⎣ ⎦
3 3 4 5 2 4 0 1
conductivity unknown sources
matrix node
voltages
Solve
⎡G +G +G G ⎤ ⎡ GV ⎤
3 4 5 3 1 0
⎢ ⎥ ⎢ ⎥
⎡e ⎤ G G +G +G G V + I
⎣ ⎦ ⎣ ⎦
1 = 3 1 2 3 4 0 1
⎢ ⎥
⎣ e ⎦ (G +G +G )(G +G +G )−G 2
2 1 2 3 3 4 5 3
( )( ) ( )( )
G +G +G G V + G G V +I
3 4 5 1 0 3 4 0 1
e =
1 2
G G +G G +G G +G G +G G +G G +G +G G +G G
1 3 1 4 1 5 2 3 2 4 2 5 3 3 4 3 5
(G )(GV )+(G +G +G )(G V +I )
e = 3 1 0 1 2 3 4 0 1
2 G G +G G +G G +G G +G G +G G +G 2 +G G +G G
1 3 1 4 1 5 2 3 2 4 2 5 3 3 4 3 5
(same denominator)
Notice: linear in V , I , no negatives
0 1
in denominator
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
Solve, given
G ⎫ 1 G ⎫ 1 1
1 2
⎬ = ⎬ = G =
G 8.2K G 3.9K 3 1.5K
⎭ ⎭
5 4
I = 0
1
( )( )
G G V + G +G +G G V +I
3 1 0 1 2 3 4 0 1
e =
( ) ( )
2 2
G +G +G + G +G +G −G
1 2 3 3 4 5 3
1 1 1
G + G + G = + + = 1
1 2 3
8.2 3.9 1.5
1 1 1
G + G + G = + + = 1
3 4 5
1.5 3.9 8.2
1 1 1
× +1×
8.2 1.5 3.9
e = V
2 1 0
1−
1.52
Check out the
e = 0.6V
2 0 DEMO
If V = 3V, then e =1.8V
0 2 0
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 2
CIRCUITS
AND
6.002
ELECTRONICS
Operational Amplifier Circuits
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 20
Review
(cid:132) Operational amplifier abstraction
(cid:141) ∞ input resistance
+
(cid:141) 0 output resistance
–
(cid:141) Gain “A” very large
(cid:132) Building block for analog systems
(cid:132) We will see these examples:
Digital-to-analog converters
Filters
Clock generators
Amplifiers
Adders
Integrators & Differentiators
Reading: Chapter 15.5 & 15.6 of A & L.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 20
Consider this circuit:
R
i
2
R
i
1
v−
–
+
v
v+
+
–
2
+
v
R
v +
OUT
1
1 – R
–
2
v = v− − iR
R
v+ = v 2 OUT 2
1 R + R v − v−
1 2 = v− − 2 ⋅ R
2
≈ v− R
1
v − v−
⎡ R ⎤ R
i = 2 = v− 1+ 2 − v 2
⎢ ⎥
R 2
R R
⎣ ⎦
1
1 1
R R + R R
= v 2 ⋅ 1 2 − v 2
1 2
R + R R R
1 2 1 1
R
= 2 (v − v )
1 2
R
1
subtracts!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 20
Another way of solving —
use superposition
v → 0 v → 0
1 2
R
R
1 v+
2
+ v
OUT
1
R v + R
1 1 – 2 –
–
R
+ 2
v v
–
2 + OUT
2
R
1
R || R
1 2
R + R
v = v+ ⋅ 1 2
R
OUT
v = − 2 v 1 R
1
OUT 2
2 R
1 v ⋅ R R + R
= 1 2 ⋅ 1 2
R + R R
1 2 1
R
= v 2
1
R
v = v + v
1
OUT OUT OUT
1 2
R
= 2 (v − v )
1 2
R
1 Still subtracts!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 20
Let’s build an intergrator…

| + | ∫ dt |
| --- | --- |

+
+
v v
–
I O
–
Let’s start with the following insight:
i
+
+
i
– C v
O
–
t
1
v = ∫ i dt
O
C
−∞
v is related to ∫ i dt
O
But we need to somehow convert
voltage v to current.
I
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 20
First try… use resistor
v
+ –
i
R
+
R
+ v
v
I – C v I → i
O
R
–
But, v must be very small compared
O
to v , or else
R v
i ≠ I
R
When is v small compared to v ?
O R
dv
RC O + v = v larger the RC,
O I
dt
smaller the v
O
v
R
dv
when RC O >> v
O for good
dt
integrator
dv
RC O ≈ v
ωRC >> 1
I
dt
t
1
or v ≈ ∫ v dt
O I Demo
RC
−∞
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 20
There’s a better way…
i
Notice
i
–
+
v− ≈ 0V under negative feedback
v
i = I
so,
R
–
R
+
v
–
I
+
v
v C
+ –
I
R
–
v = −v
R
+ O C
v
+
–
I
+
v t
1 v
O
– v = − ∫ I dt
O
C R
−∞
We have our integrator.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 20
Now, let’s build a differentiator…

| + | ddt |
| --- | --- |

+
+
v v
–
I O
–
Let’s start with the following insights:
i
dv
+
v C i = C I
I –
dt
dv
i is related to I
dt
But we need to somehow convert current
to voltage.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 20
Differentiator…
Recall
i
i
–
+
R
i
–
+
+ v v = −iR
O
O
–
current
0V
to
i
R
voltage
C
–
v
v + + v – O
– C
I
+
v = v
I C
dv
i = C I
dt
Demo dv
v = −RC I
O
dt
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 20
CIRCUITS
AND
6.002
ELECTRONICS
Op Amps Positive Feedback
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Negative vs Positive Feedback
Consider this circuit — negative feedback
v
IN
R
R
1
2
–
R
+
v
IN – 1 + R
+
v = − 2 v
OUT IN
– R
1
s
i
and this — positive feedback s
y e
l g
a a
n p
a
t
e x
R e e
s n
2
n
+ o
R
+
v
IN – 1 – + R
v = − 2 v
“ ”
OUT IN
– R
1
What’s the difference?
Consider what happens when there is a pertubation…
Positive feedback drives op amp into saturation:
v → ±V
OUT S
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Static Analysis of Positive Feedback Ckt
R
2
+
R v
v + 1 OUT
IN –
–
v+ R v
2 OUT
R
v + 1 + A ( v+ − v− )
IN – v− –
( )
v = A v+ −v−
OUT
= Av+
⎡v −v ⎤
= A OUT IN ⋅R + v
⎢ ⎥
1 IN
R + R
⎣ ⎦
1 2
AR AR v
= 1 v − 1 IN + Av
OUT IN
R + R R + R
1 2 1 2
⎡ AR ⎤ ⎡ R ⎤
v 1− 1 = v A 1− 1
⎢ ⎥ ⎢ ⎥
OUT IN
R + R R + R
⎣ ⎦ ⎣ ⎦
1 2 1 2
⎡ R ⎤
1− 1
⎢ ⎥
R + R R
v = ⎢ 1 2 ⎥⋅ Av = − 2 v
OUT AR IN R IN
⎢ − 1 ⎥ 1
⎢ R + R ⎥
⎣ ⎦
1 2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Representing dynamics of op amp…
v+ v
+ o
R
+
v* Av*
+
C
–
–
(v+ − v− )
v− –
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Representing dynamics of op amp…
Consider this circuit and let’s analyze its
dynamics to build insight.
R R
1 2
+
v
o
–
R R
3 4 v
o
A
Circuit model R
2
R
+
1 +
v+
R +
v*
+
– v
C
– o
v−
(v+ − v− ) –
–
R R
3 4
Let’s develop equation representing time
behavior of v .
o
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Dynamics of op amp…
v
v = Av* or v* = o
o
A
dv*
RC + v* = v+ − v_
dt v R +
v+ = o 1 = γ v
o
R + R
RC dv v
o + o = v+ − v_ 1 2
A dt A v R −
v− = o 3 = γ v
o
+ R + R
−
= (γ − γ ) v 3 4
o
neglect
dv ⎡ 1 A − + ⎤
or o + + (γ − γ ) v = 0
⎢ ⎥ o
dt ⎣RC RC ⎦
dv A +
−
o + (γ − γ ) v = 0
o
dt RC
time−1
dv v RC
or o + o = 0 where T =
− +
dt T A( γ − γ )
v ( 0 ) = 0
o
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Consider a small disturbance to v
o
(noise).
− +
T is positive
if γ > γ
t
−
v = K e T stable
o
+ −
if γ > γ T is negative
t
T
v = K e unstable
o
+ −
if γ = γ T is very large
v = K neutral
o
v
o
unstable
neutral
K
stable
t
disturbance
Now, let’s build some useful circuits with
positive feedback.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
One use for instability: Build on the
basic op amp as a comparator
+V
S
v+
+
v
o
v−
–
−V
S
v
o
+V
S
v+ − v−
0
−V
S
v
o

|  |  | +v |
| --- | --- | --- |

v− → 0
t
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Now, use positive feedback
v –
i
v
o
+
R
2
v R
v+ = o 1
R
R + R 1
1 2
e.g. R = R
v+ = 7.5 v = 15 1 2
o
V =15
v
S
i
( v = v− ) > 7.5 v− < v+
i
v− > 7.5 v− < −7.5
v = −15
v− = −7.5
o
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Now, use positive feedback
v –
i
v
o
+
R
2
v R
v+ = o 1
R
R + R 1
1 2
V R
e.g. R = R
v+ = S 1 v = +V 15 1 2
R + R o S V =15
v
1 2 S
i
( v = v− ) > v+ v− < v+
i
v− > 7.5 v− < −7.5
−V R
v = −V −15 v− = S 1
o S
R + R
1 2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
v
o
15

| VS |  |
| --- | --- |
| 5 0 | 7. |

hysteresis
v
i
− 7.5
Demo
−15
−V
S
Why is hysteresis useful?
e.g., analog
v
v
i
o to digital
7.5
t
− 7.5
Demo
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Without hysteresis
analog
v
v
i
o to digital
7.5
t
− 7.5
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Oscillator — can create a clock
R
v
C
–
v
o
C
+
R
1
v
o
R
2 1
v
o
V

| v+ |  |  |  |
| --- | --- | --- | --- |
| vv−−vvCC |  |  |  |
|  | vv−− |  |  |
|  | v+ |  |  |

S
V
S
2
t
V
− S
2
−V
S
Demo
Assume v = V at t = 0
o S
v = 0
C
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
Clocks in Digital Systems
(cid:132) We built an oscillator using an op amp.
t
can use as a clock
(cid:132) Why do we use a clock in a digital system?
(See page 735 of A & L)
1 1 0
sender receiver
clock
a 1,1,0?
b When is the signal valid?
common timebase -- when to “look” at a signal
(e.g. whenever the clock is high)
(cid:198) Discretization of time
one bit of information associated with
an interval of time (cycle)
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 21
CIRCUITS
AND
6.002
ELECTRONICS

| Energy and Powe |
| --- |
| te as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 22 |

r
Ci ronics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
Why worry about energy?
-
small batteries
(cid:198) good
Today:
(cid:132) How long will the battery last?
in standby mode
in active use
(cid:132) Will the chip overheat and self-destruct?
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
Look at energy dissipation in
MOSFET gates
V
S
R
+
C v
+
O
v
I
–
–
C: wiring capacitance and
C of following gate
GS
Let us determine
standby power
active use power
Let’s work out a few related examples first.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
Example 1:
I
+
+ V
R
V
–
–
2
V
P = VI =
Power
R
Energy dissipated in time T
E = VIT
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
Example 1:
for our gate
V V
S S
R
R L
L v
O
v high v v low
I O I
R R
ON ON
2
V
P = S P = 0
R + R
L ON
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
Example 2:
Consider
R
1

| S S1 2+VC–STT T1 2S closed S open1 1S open S closed2 2Find energy dissipated in each cyFind average power P .te as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 22 | S S1 2+C– |
| --- | --- |

R
2
t
cle.
Ci onics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
T : S closed, S open
1 1 2
i
assume
R
v = 0 at t = 0
1
C
+
V +
–
S
C v
C
–
v i
C
V
−t
V S V
S S e R C
R 1
1 R
1
t t
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
Total energy provided by source during T
1
T
1
E = ∫V i dt
S
0
T 2 −t
1V
= ∫ S e R C dt
1
R
0 1
−t T
2
V 1
= − S R C e R C
1
1
R
1
0
⎛ −T ⎞
1
2⎜ R C ⎟
= C V 1− e
1
S ⎜ ⎟
⎝ ⎠
2
≈ C V if T >> R C
S 1 1
I.e., if we wait long enough
1
2
C V stored on C,
S
2
Independent
1 of R!
2
E = C V dissipated in R
1 S 1
2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
T : S closed, S open
2 2 1
+
v
C
R
C
– 2
Initially, v = V (recall T >> R C)
C S 1 1
So, initially,
1
2
energy stored in capacitor = CV
S
2
Assume T >> R C
2 2
So, capacitor discharges ~fully in T
2
So, energy dissipated in R during T
2 2
1
2
E = CV
2 S
2
E , E independent of R !
1 2 2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
Putting the two together:
Energy dissipated in each cycle
E = E + E
1 2
1 1
2 2
= CV + CV
S S
2 2
2
E = CV energy dissipated in
S
charging & discharging C
Assumes C charges and discharges fully.
Average power
E
P =
T
2
CV
= S
T
2
= CV f
S
1
frequency f =
T
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
Back to our inverter —
V
S
R
L
v
O
v R
C
IN ON
What is P for the following input?
v
IN
T T
2 2
t
T
1
T =
f
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
Equivalent Circuit
R
L
+
V
C
–
S
R

| What is P for the following inpuvINT T2 2T1T =fte as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 22 |  |  |
| --- | --- | --- |

ON
t?
t
Ci ronics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
P
What is for gate?
We can show (see section 12.2 of A & L)
2 2
V R
2
P = S + CV f L
2 ( R + R ) S ( R + R )2
L ON L ON
when R >> R
L ON
2
V
P = S + CV 2 f e r
b
S m
2R
e
m
L
e
r
r
e
b
m
e
m
e
r
P P
STATIC DYNAMIC
independent of f. related to switching
MOSFET ON half capacitor
the time.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
P
What is for gate?
when R >> R
L ON
2
V
2
P = S + CV f
S
2R
L
In standby mode,
In standby mode,
f (cid:198) 0
,
half the gates in a
so dynamic power
chip can be
is 0
assumed to be on.
P
So per
STATIC
2
gate is still V .
S
2R
L
Relates to standby
power.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22
Some numbers…
a chip with 106 gates clocking
C = 1 f F
at 100 MHZ
R = 10 kΩ
L
f = 100×106
V = 5V
S
⎡ 25 ⎤
P = 106 + 10−15 × 25×100 ×106
⎢ ⎥
⎣2×104
⎦
= 106 [ 1.25 milliwatts + 2.5 microwatts ]
1.25KW! 2.5W
problem !
not bad
must get rid of this αV 2
S
α f
reduceV
next S
5V → 1V
lecture
2.5W → 150 mW
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 22

|  | CIRCUITSAND6.002ELECTRONICSSuperposition, Thévenin and Norton |
| --- | --- |
| Superposition, Thévenin and Note as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 3 | Superposition, Thévenin and No |

Ci
Op
Review
Circuit Analysis Methods
(cid:122) KVL: KCL: VI
∑V = 0 ∑ I = 0
i i
loop node
(cid:122) Circuit composition rules
(cid:122) Node method – the workhorse of 6.002
KCL at nodes using V ’s referenced
from ground
( )
e − e G
(KVL implicit in “ ”)
i j
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Linearity
R
Consider
1
e
(cid:74)
I

| R2+V–Write node equations –e −V e+ − I = 0R R1 2NolinNotete as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 3 | R2+– |
| --- | --- |

tice:
ar in e,V , I
eV ,VI
ms
Ci onics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
Linearity
R
1
Consider
R I
(cid:74)
2
+
V
–

| Write node equations --e −V e+ − I = 0 linR R1 2Rearrange --⎡ 1 1 ⎤ V+ e = +⎢ ⎥R R R⎣ ⎦1 2 1conductance node lineamatrix voltages of soG e = Ste as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 3 |  |  |
| --- | --- | --- |

ar in e,V , I
I
sum
urces
Ci onics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
Linearity
Write node equations --
e −V e
+ − I = 0 linear in e,V , I
R R
1 2
Rearrange --
⎡ 1 1 ⎤ V
+ e = + I
⎢ ⎥
R R R
⎣ ⎦
1 2 1
conductance node linear sum
matrix voltages of sources
G e = S
R R R
or e = 2 V + 1 2 I
R + R R + R
1 2 1 2
e = a V + a V +…+ b I + b I +…
1 1 2 2 1 1 2 2
Linear!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
⇒
Homogeneity
Linearity
Superposition
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
⇒ Homogeneity
Linearity
Superposition
Homogeneity
x
1
x . y
.
2 .
⇓
αx
1
αx . αy
.
2 .
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
⇒ Homogeneity
Linearity
Superposition
Superposition
x x
1a 1b
x . y x . y
2a . . a 2b . . b
⇓
x + x
1a 1b
x + x .
. y + y
2a 2b .
a b
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
⇒ Homogeneity
Linearity
Superposition
Specific superposition example:
V 0
1
y y
0 V
1 2
2
⇓
V + 0
1
y + y
0 + V
1 2
2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Method 4: Superposition method
The output of a circuit is
determined by summing the
responses to each source
acting alone.
es
ourc
s
ent
d
en
p
e
d
i n onl y
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
i i
+ +
+
V = 0 v v
–
- -
short
i
i
+
+
I = 0
v
(cid:74)
v
-
-
open
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Back to the example
Use superposition method
R
1
e
R I
(cid:74)
2
+
V
–
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Back to the example
Use superposition method
V acting alone
e
R
1
R
e = 2 V
R I = 0
V R + R
2 +
V
1 2
–
I acting alone
e
R
1
R R
e = 1 2 I
R I
(cid:74)
I
2
R + R
V = 0
1 2
sum superposition
R R R
e = e + e = 2 V + 1 2 I
V I
R + R R + R
1 2 1 2
Voilà !
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Demo
salt
water
constant
+
–
?
+
–
output shows
superposition
sinusoid
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Yet another method…
Consider
Arbitrary network
N
i
resistors
V
+
m
+ I
i
(cid:74)
v
– n
(cid:74)
-
also
By superposition
independent
of external
v = ∑α V + ∑ β I + Ri
excitement &
m m n n
m n
behaves like
a resistor
no
resistance
units
units
By setting All
∀ I = 0,
∀ I = 0, ∀ V = 0,
n n
n n m m
∀ V = 0
i = 0 i = 0
m m
independent of external
excitation and behaves like a
v
voltage “ ”
TH
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Or
v = v + R i
TH TH
As far as the external world is concerned
(for the purpose of I-V relation),
“Arbitrary network N” is indistinguishable
from:
R
N
TH
+
Thévenin
+
v i
v equivalent
(cid:74)
–
TH
network
-
v open circuit voltage
TH
at terminal pair (a.k.a. port)
R resistance of network seen
TH
from port
(V ’s, I ’s set to 0)
m n
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Method 4:
The Thévenin Method
i
N
(cid:74)
+
+
– v E
+
– -
Thévenin equivalent
R
i
TH
+
+
v v E
–
TH
-
Replace network N with its Thévenin
equivalent, then solve external network E.
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Example:
R
i
1
1

| + V R I – 2 (cid:74) |  | R I (cid:74)2 |  |
| --- | --- | --- | --- |
| i R1 1RTH+V +V I– TH –V − Vi = TH1R + R1 THte as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 3 |  |  |  |

Ci onics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
Example:

| R(cid:74) I2 |
| --- |
| R2 |

V :
+
TH
V
TH
-
V = IR
TH 2
R : +
TH
R
R
2
TH
-
R = R
TH 2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Graphically,
v = v + R i
TH TH
i
1

| vTH“ ”VOC− ISCOpen circuit v = vTH( )i ≡ 0− vShort circuit i = TH( ) Rv ≡ 0THte as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 3 |  |  |
| --- | --- | --- |

R
TH
v
V
OC
− I
SC
Ci onics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
in recitation,
Method 5:
see text
The Norton Method
i
(cid:74)
+
+
R = R
I – v
(cid:74)
TH N
+ N
– -
Norton
equivalent
V
I = TH
N
R
TH
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
Summary
(cid:132)Discretize matter
LMD LCA
Physics EE
(cid:132) R, I, V Linear networks
(cid:132) Analysis methods (linear)
KVL, KCL, I — V
Combination rules
Node method
Superposition
Thévenin
Norton
(cid:132) Next
Nonlinear analysis
Discretize voltage
…
…
101100
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 3
CIRCUITS
AND
6.002
ELECTRONICS

| Nonlinear Analysi |
| --- |
| te as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 6 |

Ci onics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
Review
(cid:132) Discretize matter (cid:116) LCA
m1 (cid:88) KVL, KCL, i-v
any
m2 (cid:88) Composition rules
circuit
m3 (cid:88) Node method
m4 (cid:88) Superposition
linear
m5 (cid:88) Thévenin, Norton circuits
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 6
Review
(cid:132) Discretize value (cid:116) Digital abstraction
(cid:88) Subcircuits for given “switch”
setting are linear! So, all 5
methods (m1 – m5) can be
applied
V V
S A =1 S
R R
B =1
L L
C C
A B R R
ON ON
SR MOSFET Model
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 6
Today
(cid:132) Nonlinear Analysis
(cid:88) Analytical method
based on m1, m2, m3
(cid:88) Graphical method
(cid:88) Introduction to incremental analysis
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 6
How do we analyze nonlinear
circuits, for example:
i Hypothetical
D
nonlinear

| + |  | D |
| --- | --- | --- |
| –D- |  |  |

+
V
–
device
(Expo Dweeb ☺)
+ v -
D
D
i
D bv
i = ae
D
D
i
D
a
v
D
0,0
(Curiously, the device supplies power when v is negative)
D
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 6
Method 1: Analytical Method
Using the node method,
(remember the node method applies for linear or
nonlinear circuits)
v −V
D + i = 0
1
D
R
i = ae bv 2
D
D
2 unknowns 2 equations
Solve the equation by
(cid:132) trial and error
(cid:132) numerical methods
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 6
Method 2: Graphical Method
Notice: the solution satisfies equations
1 and 2

| iD2aV vi = −i 1DD RVslope =RVte as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 6 | iD2 |
| --- | --- |

bv
= ae
D
D
v
D
D
1
R
v
D
Ci onics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
Combine the two constraints
i
D

| V1 calleRfor r~ 0.4will sa¼~ 0.5V1e.g. V =1 v = 0.5VDR =1 i = 0.4AD1a =4b =1te as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 6 | V1R~ 0.4a¼ | callefor rwill s |
| --- | --- | --- |
|  | a ¼ |  |

“loadline”
asons you
e later
v
D
Ci onics, Spring 2007. MIT
Op loaded on [DD Month YYYY].
Method 3: Incremental Analysis
Motivation: music over a light beam
Can we pull this off?

| + |  | i D |
| --- | --- | --- |
| v LED- | LE | D |

| i i D R + + v (t) v LED – I D - light | AM |  |  |  |
| --- | --- | --- | --- | --- |
| + v (t) v LED I | AMP | AM |  | P |
| v LED A–ID-lightintensityi ∝ II ∝ i R RD Dlight iv music signalI in phot LEEmexv (t) i (t) light i (tI D Rnonlinearlinearproblem! will result inte as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 6 | A | A |  | intensity photoreceiver Light on |
| light |  |  |  |  |

v
sity I
R
ceiver
ht
ep ☺
sound
rtion
Ci ring 2007. MIT
Op [DD Month YYYY].
Problem:
The LED is nonlinear distortion
i
D

| ttivDDtte as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 6 |  |  |  | Electronics, Downloaded D v |
| --- | --- | --- | --- | --- |
| t |  |  |  | vD |

v
D
v = v
D I
Ci , Spring 2007. MIT
Op d on [DD Month YYYY].
If only it were linear …
i
i D
D

|  |  |  | vD |
| --- | --- | --- | --- |
| tit would’ve been ok.What do we do?Zen is the answer… next lecture!te as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Down6.002 Fall 2000 Lecture 6 |  |  |  |

v
D
Ci , Spring 2007. MIT
Op d on [DD Month YYYY].
CIRCUITS
AND
6.002
ELECTRONICS

| Incremental Analysis |
| --- |
| ite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElecpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Dow6.002 Fall 2000 Lecture 7 |

C ronics, Spring 2007. MIT
O loaded on [DD Month YYYY].
Review
Nonlinear Analysis
(cid:88) Analytical method
(cid:88) Graphical method
Today
(cid:88) Incremental analysis
Reading: Section 4.5
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 7
Method 3: Incremental Analysis
Motivation: music over a light beam
Can we pull this off?

| +v LED |  | i D LED |
| --- | --- | --- |
| + v LED | LE | D |
| - |  |  |

| i i D R + + v (t) v LED I | AM |  |  |  |
| --- | --- | --- | --- | --- |
| + v (t) v LED I | AMP | AM |  | P |
| -lightintensityi ∝ II ∝ i R RD Dlight iv music signalI in phot LEEmexv (t) i (t) light i (tI D Rnonlinearlinearproblem! will result inite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElecpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Dow6.002 Fall 2000 Lecture 7 |  | I R LED: Emitting expoDweep (t) Electronics, Downloaded |  | intensity photoreceiver Light on |

v
sity I
R
ceiver
ht
ep ☺
sound
rtion
C ring 2007. MIT
O n [DD Month YYYY].
Problem:
The LED is nonlinear distortion
i
D

| ttivDDtite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElecpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Dow6.002 Fall 2000 Lecture 7 |  |  |  | Electronics, Downloaded D v |
| --- | --- | --- | --- | --- |
| t |  |  |  | vD |

v
D
v = v
D I
C , Spring 2007. MIT
O d on [DD Month YYYY].
Insight:
i
D
I small region
D
looks linear

| (abVDDC offsetor DC biasTrick:i =+ Dv (t)–i +v v LEDI D-+V–I vDite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElecpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Dow6.002 Fall 2000 Lecture 7 | (ab |
| --- | --- |

ut V , I )
D D
v
D
I + i
D d

| LE | D |
| --- | --- |

V + v
D d
V v
I i
C ronics, Spring 2007. MIT
O loaded on [DD Month YYYY].
Result
i
D

| idIDVDvvery smalldite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElecpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Dow6.002 Fall 2000 Lecture 7 |  |  |  |
| --- | --- | --- | --- |
| I D |  |  |  |

v
D
C ronics, Spring 2007. MIT
O loaded on [DD Month YYYY].
Result
v = v
v
D I
d

|  | VD |  |  |
| --- | --- | --- | --- |
| i iD diDIDtDemoite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElectpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Dow6.002 Fall 2000 Lecture 7 |  |  |  |

D
t
linear!
C ronics, Spring 2007. MIT
O loaded on [DD Month YYYY].
The incremental method:
(or small signal method)
1. Operate at some DC offset
or bias point V , I .
D D
2. Superimpose small signal v
d
(music) on top of V .
D
3. Response i to small signal v
d d
is approximately linear.
Notation:
i = I + i
D D d
total DC small
variable offset superimposed
signal
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 7
What does this mean
mathematically?
Or, why is the small signal response
linear?
nonlinear
( )
i = f v
D D
large DC
We replaced v
d
v = V + Δv
increment
D D D
about V
D
using Taylor’s Expansion to expand
f(v ) near v =V :
D D D
df (v )
( )
i = f V + D ⋅Δv
D D D
dv
D v =V
D D
1 d 2 f (v )
2
+ D ⋅Δv +(cid:34)
2 D
2! dv
D v =V
D D
neglect higher order terms
because Δ v is small
D
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 7
d f (v )
( )
i ≈ f V + D ⋅Δv
D D D
dv
D v =V
D D
constant constant w.r.t. Δv
D
w.r.t. Δv slope at V , I
D D D
We can write
d f (v )
( )
X : I + Δi ≈ f V + D ⋅Δ v
D D D D
dv
D v =V
D D
equating DC and time-varying parts,
( )
I = f V operating point
D D
d f (v )
Δi = D ⋅Δv
D D
dv
D v =V
D D
constant w.r.t. Δv
D
so, Δi ∝ Δv By notation,
D D
Δi = i
D d
Δv = v
D d
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 7
In our example,
bv
i = a e D
D
bV bV
From X : I + i ≈ a e D + a e D ⋅b ⋅v
D d d
Equate DC and incremental terms,
bV
I = a e operating point
D
D
aka bias pt.
aka DC offset
bV
i = a e ⋅b ⋅v
D
d d
i = I ⋅b ⋅v
small signal
d D d
behavior
constant
linear!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 7
Graphical interpretation
bV
I = a e operating point
D
D
i = I ⋅b ⋅v
d D d
A
slope at
i
D V , I
D D
I B
D
operating
point
v
d
v
D
V
D
we are
approximating
A with B
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 Fall 2000 Lecture 7
graphically
We saw the small signal
mathematically
now, circuit
Large signal circuit:

|  |  | I D |
| --- | --- | --- |
| – LE | LE | D |

| ++V– LED V IID- DSmall signal reponse: i = I b vd D d+ v -dbehaves like:i1dR =I bDsmall signal circuit:id+1+v v–i d- I bDLinear!ite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and ElecpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Dow6.002 Fall 2000 Lecture 7 | ID | bV= a eD |
| --- | --- | --- |

C IT
O YYYY].
CIRCUITS
AND
6.002
ELECTRONICS
Dependent Sources
and Amplifiers
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Review
(cid:132) Nonlinear circuits — can use the
node method
(cid:132) Small signal trick resulted in linear
response
Today
(cid:132) Dependent sources
(cid:132) Amplifiers
Reading: Chapter 7.1, 7.2
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Dependent sources
Seen previously
v
+ – v
i =
Resistor
i R
R
+ v –
Independent
i = I
i I
Current source
2-terminal 1-port devices
New type of device: Dependent source
i
i
I
O

| f ( v )I |  |
| --- | --- |
| f ( v ) I |  |

+ +
output
control
v
v
I port
O
port
– –
2-port device
E.g., Voltage Controlled Current Source
Current at output port is a function of voltage
at the input port
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Dependent Sources: Examples
Example 1: Find V
+
R
V
–
independent
current
I = I
source 0
V = I R
0
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Dependent Sources: Examples
Example 2: Find V
+
voltage
R
V
controled –
current
K
source ( )
I = f V =
V
i i
I O

| K |  |
| --- | --- |
| ( )f v =IvI |  |

+ +
+
v
R v
V
I
O
–
– –
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Dependent Sources: Examples
Example 2: Find V
voltage
controled
+
current R
V
–
source
K
( )
I = f V =
V
e.g. K = 10-3 Amp·Volt
R = 1kΩ
K
V = IR = R
V
or V 2 = KR
or V = KR
= 10−3 ⋅103
= 1Volt
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Another dependent source example
+
V
R –
S
L
i i
IN D
+ +
+
v v v
I – IN O
– –
( )
i = f v
D IN
e.g.
( )
i = f v
D IN
K
( )2
= v −1 for v ≥ 1
IN IN
2
i = 0 otherwise
D
Find v as a function of v .
O I
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Another dependent source example
V
S
R
L
i i
IN D
+ +
+
v v v
I – IN O
– –
( )
i = f v
D IN
( )
e.g. i = f v
D IN
K
= ( v −1 )2 for v ≥ 1
IN
IN
2
i = 0 otherwise
D
Find v as a function of v .
O I
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Another dependent source example
V
S
R
L
v
v
O
I
K
v + i = ( v −1 )2 for v ≥ 1
IN
D IN
I – 2
i = 0 otherwise
D
Find v as a function of v .
O I
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Another dependent source example
V
S
R
L
v
v
O
I
K
v + i = ( v −1 )2 for v ≥ 1
IN
D IN
I – 2
i = 0 otherwise
D
KVL
−V + i R + v = 0
S D L O
v = V − i R
O S D L
K
( )2
v = V − v −1 R for v ≥ 1
O S I L I
2
v = V for v < 1
O S I
Hold that thought
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Next, Amplifiers
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Why amplify?
Signal amplification key to both analog
and digital processing.
Analog:

| AMPIN OUT |
| --- |

Input
Output
Port
Port
Besides the obvious advantages of being
heard farther away, amplification is key
to noise tolerance during communcation
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Why amplify?
Amplification is key to noise tolerance
during communcation
No amplification
10 mV
e
s
oi
n
1 mV
useful
signal
huh?
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Try amplification
e
s
oi
n
AMP
not bad!
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Why amplify?
Digital:
Valid region
5V 5V
V
V
IN OUT OH
IH
V
IL V
OL
0V 0V
Digital System
OUT
IN
5V 5V
V
V
OH
IH
V
IL V
OL
0V t 0V t
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Why amplify?
Digital:
Static discipline requires amplification!
Minimum amplification needed:
V V −V
V
OH OH OL
IH
V
V −V
IL V
IH IL
OL
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
An amplifier is a 3-ported device, actually
Power port
i i
I O

| Amplifier |
| --- |

Input Output
+ +
v v
port – I – O port
We often don’t show the power port.
Also, for convenience we commonly observe
“the common ground discipline.”
In other words, all ports often share a
common reference point called “ground.”

| POWER |
| --- |
| IN OUT |

How do we build one?
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Remember?
V
S

| RLvvOIiD |  |
| --- | --- |
| O I i D | vOiD |

K
v + = ( v −1 )2 for v ≥ 1
IN
IN
I – 2
i = 0 otherwise
D
KVL
−V + i R + v = 0
S D L O
v = V − i R
O S D L
K
( )2
v = V − v −1 R for v ≥ 1
O S I L I
2
v = V for v < 1
O S I
Claim: This is an amplifier
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
So, where’s the amplification?
Let’s look at the v versus v curve.
O I
mA
e.g. V = 10V , K = 2 , R = 5kΩ
S V 2 L
K
( )2
v = V − R v −1
O S L I
2
2
= 10 − ⋅10−3 ⋅ 5 ⋅103 ( v −1 )2
I
2
( )2
v = 10 − 5 v −1
O I
v
O
V
S
Δv
O
v
Δv I
1
I
Δv
O > 1
amplification
Δv
I
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
Plot v versus v
O I
( )2
v = 10 − 5 v − 1
O I

| vI | vO |
| --- | --- |
| 0.0 | 10.00 |
| 1.0 | 10.00 |
| 1.5 | 8.75 |
| 2.0 | 5.00 |
| 2.1 | 4.00 |
| 2.2 | 2.80 |
| 2.3 | 1.50 |
| 2.4 | ~ 0.00 |

0.1 change 1V change
in v in v
I O
Gain!
Demo Measure v .
O
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
One nit …
v
O
What
happens
here?
v
I
1
Mathematically,
K
( )2
v = V − R v −1
O S L I
2
So is mathematically predicted behavior
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
One nit …
v
K
O
( )2
v = V − R v −1
O S L I
2
What
happens
here?
v
I
1
However, from
K
( )2
i = v −1 for v ≥ 1
D I I
2
V
S
R
L
v
O
VCCS i
D
For v >0, VCCS consumes power: v i
O O D
For v <0, VCCS must supply power!
O
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
If VCCS is a device that can source
power, then the mathematically
predicted behavior will be observed —
v K
( )2
O i.e. v = V − R v −1
O S L I
2
where v goes -ve
O
v
I
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
If VCCS is a passive device,
then it cannot source power,
so v cannot go -ve.
O
So, something must give!
Turns out, our model breaks down.
K
Commonly i = ( v −1 )2
D I
2
will no longer be valid when v ≤ 0 .
O
e.g. i saturates (stops increasing)
D
and we observe:
v
O
v
I
1
Cite as: Anant Agarwal and Jeffrey Lang, course materials for 6.002 Circuits and Electronics, Spring 2007. MIT
OpenCourseWare (http://ocw.mit.edu/), Massachusetts Institute of Technology. Downloaded on [DD Month YYYY].
6.002 – Fall 2002: Lecture 8
