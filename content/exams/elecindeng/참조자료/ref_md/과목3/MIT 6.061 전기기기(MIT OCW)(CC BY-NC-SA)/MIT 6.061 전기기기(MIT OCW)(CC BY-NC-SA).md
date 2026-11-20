# MIT 6.061 전기기기(MIT OCW)(CC BY-NC-SA)

> 원문: MIT OpenCourseWare — https://ocw.mit.edu · CC BY-NC-SA 4.0 · © Massachusetts Institute of Technology


Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes Chapter 6
Magnetic Circuit Analog to Electric Circuits ∗
J.L. Kirtley Jr.
1 Introduction
In this chapter we describe an equivalence between electric and magnetic circuits and in turn a
method of describing and analyzing magnetic field systems which can be described in magnetic
circuit fashion. As it turns out, the equivalence is a fair approximation to reality and may be used
with some confidence.
Magneticcircuitsarethosepartsofdevicesthatemploy magnetic fluxtoeitherinducevoltageor
produceforce. Suchdevicesincludetransformers,motors,generatorsandotheractuators(including
things such as solenoid actuators and loudspeakers). In such devices it is necessary to produce
and guide magnetic flux. This is usually done with pieces of ferromagnetic material (which has
permeability very much larger than free space). In this sense, magnetic circuits are like electric
circuits in which conductive material such as aluminum or copper has high electric conductivity
and are used to guide electric current.
The analogies between electric and magnetic circuits are two: the electric circuit quantity of
current is analogous to magnetic circuit quantity flux. (Both of these quantities are ’solenoidal’ in
the sense that they have no divergence). The electric circuit quantity of voltage, or electomotive
force (EMF) is analogous to the magnetic circuit quantity of magnetomotive force (MMF). EMF
E 
H 
is the integral of electric field
, MMF is the integral of magnetic field
.
2 Electric Circuits and Kirchoff’s Laws
2.1 Conservation of Charge and KCL
To begin with, consider the law of Conservation of Charge:
d
 J · d a = qdv = 0
dt vol
 
∗ c2003 James L. Kirtley Jr.
This assumes, of course, that there is no accumulation of charge anywhere in the system. This
is not a wonderful assumptionfor any systemswith capacitorplates, but if one considers capacitors
to be circuit elements so that both plates of a capacitor are part of any given element the right
hand side of this expression really is zero.
Thsn, if we note current to be the integral of current density: Over some area, a fraction of the
whole area around a node:
i = J · d a
k Ak
 
then we have:
i = 0
k
k
 
2.2 Faraday’s Law
:
d
E · d = − B · d a
dt
 
The left-handintegral may be taken to be a number of sub-integrals, each denoted by a discrete
fractional integral:
bk
E · d 
v =
k
ak
 
If we assume that there are no substantive flux linkages among the circuit elements:
B 
= 0
 
then we have KVL:
v = 0
k
k
 
2.3 Ohm’s Law
At this point it is probably appropriate to note that Ohm’s Law can be used to derive the consti­
tutive relationship for a resistor. Suppose we have a conductive element similar to the rectangular
solid shown in Figure 1. Assume current is confined in this element and flowing perpendicular to
the flat end shown in the figure. Current density is
I
J =
x
hw
where I is to total current and h and w are height and width of the conductor, respectively.
Electric field along the length of the element is:
J
x
E =
x
σ
where σ is the electrical conductivity of the material. Voltage developed is:
J
x
v = E d = l
k x
σ
 
Which leads us to an expression for element resistance:
v l
R = =
I hwσ
x
−
V
h +
l
w
I
Figure 1: Simple circuit element
3 Magnetic Circuits
As it turns out, magnetic circuits are very similar and are governed by laws that are not at all
different from those of electric circuits, with only one minor difference.
3.1 Conservation of Flux: Gauss’ Law
To start, Gauss’ law is:
 B · d a =0
 
This reflects that notion that there are no sources of flux: this is a truely sinusoidal quantity.
It neither begins nor ends but just goes in circles.
If we note a fraction of the surface around a node and call it surface k, the flux through that
surface is:
Φ = B · d a
k Ak
 
If we take the sum of all partial fluxes through a surface surrounding a note we come to the
analog of KCL:
Φ = 0
k
k
 
3.2 MMF: Ampere’s Law
Ampere’s Law is simply stated as:
H · d = J · d a
 
The integral of current density J is current, quantified in the SI system as Amperes. As it is
generally carried in wires which might number, say , N, it is often quantified as:
J · d a = NI
 
For this we will often use the term MagnetoMotive Force or MMF, which gets the symbol F. If
we use that symbol to denote the integral of magnetic field over a magnetic circuit element:
bk
H · d 
F =
k
ak
 
Then, if we take enough of these subintegrals to cover the loop around a group of elements, we
have
F = NI
k
k
 
Note that this is not exactly the same as KVL, as it has a source term on the right.
3.3 Magnetic Circuit Element: Analogy to Ohm’s Law
Magnetic circuits have an equivalent to resistance. It is the ratio of MMF to flux and has the
symbol R. I direct comparison with the derivation of resistance, a magnetic circuit element is
shown in Figure 2.
x
−
F
h +
l
w
Φ
Figure 2: Magnetic circuit element
Assume that the material of this element has permeability µ > µ 0, so that it has a constitutive
relationship:
B = µH
x x
If flux density in the material is uniform, total flux through the element is:
Φ = hwB = hwµH
x x
And the MMF is simply the integral of magnetic field H from one end to the other: again we
assume uniformity so that:
F = H
x
The reluctance of this element is then:
F 
R = =
Φ hwµ
3.4 Magnetic Gaps
In reality, magnetic circuits tend to be made up of very highly permeable elements (pieces of iron)
and relatively small air-gaps. A sketch of such a gap is shown in Figure 3.
w
µ
µ h
g
Figure 3: Gap between magnetic elements
It is usually permissible to assume that iron elements have very high permeability (µ → ∞), so
that there is negligible MMF drop. In this sense the iron elements serve in the same role as copper
or aluminum wire in electric circuits. The gap, on the other hand, has reluctance:
g
R =
g
hwµ
0
H
a
B
B H
m g m
µ µ
Fringing Field
Figure 4: Gap details
3.5 Boundary Conditions
Shown in Figure 4 is the cross-section of a gap. It is assumed that the elements shown have some
depth into the paper which is greater than the gap width g. If the permeability of the elements to
the right and the left is very high, we say that magnetic flux is largely confined to those elements.
Note that the boundary condition associated with Ampere’s Law dictates that the magnetic field
intensity H in the air adjacent to the permeable material and parallel with the surface must be
a
equal to the magnetic field intensity H just inside the magnetic material and parallel with the
m
surface. If the material is very highly permeable (µ → ∞), that magnetic field must be nearly zero:
H = H → 0. This means that magnetic field must be perpendicular to the surface of very highly
a m
permeable material. This is the case in the gap itself, where:
B = B
g m
We should note, however, that there will be ’fringing’ fields in the region near the gap, so that our
expression for the reluctance of the gap will not be quite correct. The accuracy of the expression
which ignores fringing is best for really small gaps and generally over-estimates the reluctance.
4 Faraday’s Law and Inductance
Changing magnetic fields give rise to electric fields and consequently produce voltage. This is how
inductance works. Consider the situation shown rather abstractly in Figure 5.
Faraday’s Law is, in integral form:
d
E · d = − B · nda
Area
dt
 
If the contour shown is highly conducting (say, if it is a wire), there is zero electric field over
that part of the contour. Voltage across the terminals is:
b
V = E · d 
ab
a
 
and that is the whole of the integral above. Thus we may conclude that:
dl
n
a
+
i
V
−
b
Figure 5: Loop for Faraday’s Law
d
V = − B · nda
ab Area
dt
 
Now, if we define flux linked by this contour to be:
λ = − B · nda
Area
 
then voltage is, as we expect:
dλ
V =
ab
dt
As it turns out, current flowing in the wire with sense shown by i in Figure 5 tends to produce
flux with sense opposite to the normal vector shown in that figure, and so produces positive flux.
Generally, in calculating inductance, one uses the ’right hand rule’ in determing the direction of
flux linkage: if the fingers of your right hand follow the direction of the winding, from the positive
terminal, positive flux is in the direction of your thumb.
4.1 Example: Solenoid Actuator
Shown in Figure 6 is a representationof a common solenoid actuator. When current is put through
the coil a magnetic flux appears in the gaps and pulls the plunger to the left. We will examine the
force and how to calculate it in later chapters. For now, however, we are concerned with magnetic
fields in the device and with the calculation of inductance. Assume that the stator and plunger
are both made of highly permeable materials (µ → ∞). If the coil carries current I in N turns in
the sense shown, magnetic flux will cross the narrow air-gap to the right in the direction from the
stator to the plunger and then return in the sense shown in the variable length gap of width x. It
is clear that this is also positive sense flux for the coil.
The magnetic circuit equivalent is shown in Figure 7. All of the flux produced crosses the
variable width gap which has reluctance:
Depth D perpendicular to view
NI
Coil
Plunger
g
h
B
µ
Stator
w
x
Figure 6: Cross-Section of Solenoid Actuator
Φ
x
F
g g
Figure 7: Magnetic Equivalent Circuit of Solenoid Actuator
x
R =
x
µ hD
0
Half of the flux crosses each of the other two gaps, which are in parallel and have reluctance:
g
R =
g
µ wD
0
Total flux in the magnetic circuit is
F
Φ =
1
R + R
x 2 g
And since λ = NΦ and F = NI, the inductance of this structure is:
N2 N2
L = =
R R + 1 R
x 2 g
Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes Chapter 8
Electromagnetic Forces and Loss Mechanisms ∗
J.L. Kirtley Jr.
1 Introduction
This section of notes discusses some of the fundamental processes involved in electric machin­
ery. In the section on energy conversion processes we examine the two major ways of estimating
electromagnetic forces: those involving thermodynamic arguments (conservation of energy) and
field methods (Maxwell’s Stress Tensor). In between these two explications is a bit of description
of electric machinery, primarily there to motivate the description of field based force calculating
methods.
The subsection of the notes dealing with losses is really about eddy currents in both linear and
nonlinear materials and about semi-empirical ways of handling iron losses and exciting currents in
machines.
2 Energy Conversion Process:
In a motor the energy conversion process can be thought of in simple terms. In “steady state”,
electric power input to the machine is just the sum of electric power inputs to the different phase
terminals:
P = v i
e i i
i
 
Mechanical power is torque times speed:
P = T Ω
m
And the sum of the losses is the difference:
P = P −P
d e m
∗ c2003 James L. Kirtley Jr.
Electro-
Mechanical
Electric Power In Mechanical Power Out
Converter
Losses: Heat, Noise, Windage,...
Figure 1: Energy Conversion Process
It will sometimes be convenient to employ the fact that, in most machines, dissipation is small
enoughtoapproximatemechanicalpowerwith electricalpower. Infact,therearemanysituationsin
whichthelossmechanismisknownwell enoughthatit canbeidealized away. The“thermodynamic”
arguments for force density take advantage of this and employ a “conservative” or lossless energy
conversion system.
2.1 Energy Approach to Electromagnetic Forces:
f
+
Magnetic Field
v x
- System
Figure 2: Conservative Magnetic Field System
To start, consider some electromechanical system which has two sets of “terminals”, electrical
and mechanical, as shown in Figure 2. If the system stores energy in magnetic fields, the energy
stored depends on the state of the system, defined by (in this case) two of the identifiablevariables:
flux (λ), current (i) and mechanical position (x). In fact, with only a little reflection, you should
be able to convince yourself that this state is a single-valued function of two variables and that the
energy stored is independent of how the system was brought to this state.
Now, all electromechanical converters have loss mechanisms and so are not themselves conser­
vative. However, the magnetic field system that produces force is, in principle, conservative in the
sense that its state and stored energy can be described by only two variables. The “history” of the
system is not important.
It is possible to chose the variables in such a way that electrical power into this conservative
system is:
dλ
P e = vi = i
dt
Similarly, mechanical power out of the system is:
dx
P m = fe
dt
The difference between these two is the rate of change of energy stored in the system:
dW
m = P e −P m
dt
It is then possible to compute the change in energy required to take the system from one state to
another by:
a
W (a)−W (b) = idλ −fedx
m m
b
 
where the two states of the system are described by a = (λ ,x ) and b = (λ ,x )
a a b b
If the energy stored in the system is described by two state variables, λ and x, the total
differential of stored energy is:
∂W ∂W
m m
dW = dλ + dx
m
∂λ ∂x
and it is also:
dW = idλ −fedx
m
So that we can make a direct equivalence between the derivatives and:
∂W
fe = − m
∂x
This generalizes in the case of multiple electrical terminals and/or multiple mechanical termi­
nals. For example, a situation with multiple electrical terminals will have:
dW = i dλ −fedx
m k k
k
 
And the case of rotary, as opposed to linear, motion has in place of force fe and displacement
x, torque T e and angular displacement θ.
In many cases we might consider a system which is electricaly linear, in which case inductance
is a function only of the mechanical position x.
λ(x) = L(x)i
In this case, assuming that the energy integral is carried out from λ = 0 (so that the part of the
integral carried out over x is zero),
λ 1 1 λ2
W = λdλ =
m
0 L(x) 2L(x)
 
This makes
1 ∂ 1
fe = − λ 2
2 ∂x L(x)
Note that this is numerically equivalent to
1 ∂
fe = − i 2 L(x)
2 ∂x
This is true only in the case of a linear system. Note that substituting L(x)i = λ too early in the
derivation produces erroneous results: in the case of a linear system it is a sign error, but in the
case of a nonlinear system it is just wrong.
2.1.1 Coenergy
We often will describe systems in terms of inductance rather than its reciprocal, so that current,
rather than flux, appears to be the relevant variable. It is convenient to derive a new energy
variable, which we will call co-energy, by:
 
W = λ i −W
m i i m
i
 
and in this case it is quite easy to show that the energy differential is (for a single mechanical
variable) simply:
dW = λ di + fedx
m k k
k
 
so that force produced is:
 
∂W
f = m
e
∂x
Consider a simple electric machine example in which there is a single winding on a rotor (call
it the field winding and a polyphase armature. Suppose the rotor is round so that we can describe
the flux linkages as:
λ = L i + L i + L i + M cos(pθ)i
a a a ab b ab c f
2π
λ = L i + L i + L i + M cos(pθ − )i
b ab a a b ab c f
3
2π
λ = L i + L i + L i + M cos(pθ + )i
c ab a ab b a c f
3
2π 2π
λ = M cos(pθ)i + M cos(pθ − )i + M cos(pθ + )+L i
f a b f f
3 3
Now, this system can be simply described in terms of coenergy. With multiple excitation it
is important to exercise some care in taking the coenergy integral (to ensure that it is taken over
a valid path in the multi-dimensional space). In our case there are actually five dimensions, but
only four are important since we can position the rotor with all currents at zero so there is no
contribution to coenergy from setting rotor position. Suppose the rotor is at some angle θ and that
the four currents have values i a0, i b0, i c0 and i f0. One of many correct path integrals to take would
be:
ia0
 
W = L i di
m a a a
0
 
ib0
+ (L ab i a0 + L a i b )di b
0
 
ic0
+ (L ab i a0 + L ab i b0 + L a i c )di c
0
 
if0 2π 2π
+ M cos(pθ)i a0 + M cos(pθ − )i b0 + M cos(pθ + )i c0 + L f i f di f
3 3
0
 
 
 
The result is:
1
W m =
L a i2 a0 + i2 b0 + i2 co + L ab (i ao i b0 + i ao i c0 + i co i b0)
2
 2π 2π 1
+Mi f0 i a0 cos(pθ)+i b0 cos(pθ − 3 )+i c0 cos(pθ + 3 ) + 2 L f i2 f 0
 
If there is no variation of the stator inductances with rotor position θ, (which would be the
case if the rotor were perfectly round), the terms that involve L and L ab) contribute zero so that
a (
torque is given by:
 
∂W 2π 2π
T e = m = −pMi f0 i a0 sin(pθ)+i b0 sin(pθ − )+i co sin(pθ + )
∂θ 3 3
 
We will return to this type of machine in subsequent chapters.
2.2 Continuum Energy Flow
At this point, it is instructive to think of electromagnetic energy flow as described by Poynting’s
Theorem:
S 
E 
H 
=
×
Energy flow S , called Poynting’s Vector, describes electromagnetic power in terms of electric and
magnetic fields. It is power density: power per unit area, with units in the SI system of units of
watts per square meter.
Tocalculateelectromagneticpowerintosomevolumeof space,wecanintegratePoyting’sVector
over the surface of that volume, and then using the divergence theorem:
P = − S · nda = − · S dv
vol
 
Now, the divergence of the Poynting Vector is, using a vector identity:
S 
E ×H 
H 
E −E 
H 
 ·
= ·
=
· ×
· ×
 ∂B 
−H 
−E 
J 
=
·
·
∂t
The power crossing into a region of space is then:
∂B 
P = E ·J + H · dv
vol ∂t 
 
Now, in theabsence of material motion, interpretationof thetwo termsinthisequationisfairly
simple. The first term describes dissipation:
2σ
2ρ
E 
J 
|E 
|J 
=
·
|
=
|
The second term is interpreted as rate of change of magnetic stored energy. In the absence of
hysteresis it is:
∂W ∂B 
m
H 
·
=
∂t ∂t
Note that in the case of free space,
∂B ∂H ∂ 1
H · = µ 0 H · = µ 0|H | 2
∂t ∂t ∂t 2
 
which is straightforwardedly interpreted as rate of change of magnetic stored energy density:
1
= µ 0|H| 2
W
m
2
Somematerialsexhibithystereticbehavior,inwhichstored energyisnot asinglevaluedfunction
B 
H 
of either
or
, and we will consider that case anon.
2.3 Material Motion
E 
In the presence of material motion v, electric field
in a “moving” frame is related to electric field
E 
B 
in a “stationary” frame and to magnetic field
by:
E = E + v × B 
This is an experimental result obtained by observing charged particles moving in combined electric
and magnetic fields. It is a relatavisticexpression, so that the qualifiers “moving” and “stationary”
are themselves relative. The electric fields are what would be observed in either frame. In MQS
B 
systems, the magnetic flux density
is the same in both frames.
The term relating to current density becomes:
E ·J = E − v ×B · J 
 
E 
J 
·
as dissipation, but the second term bears a little examination. Note
We can interpret
that it is in the form of a vector triple (scalar) product:
− v ×B · J = − v · B ×J = − v · J ×B 
This is in the form of velocity times force density and represents power conversion from electro­
magnetic to mechanical form. This is consistent with the Lorentz force law (also experimentally
observed):
F 
J 
B 
=
×
This last expression is yet another way of describing energy conversion processes in electric
machinery, as the component of apparent electric field produced by material motion through a
magnetic field, when reacted against by a current, produces energy conversion to mechanical form
rather than dissipation.
2.4 Additional Issues in Energy Methods
There are two more important and interesting issues to consider as we study the development
of forces of electromagnetic origin and their calculation using energy methods. These concern
situations which are not simply representable by lumped parameters and situations that involve
permanent magnets.
2.4.1 Coenergy in Continuous Media
Considerasystemwithnotjust amultiplicity of circuitsbut acontinuumof current-carryingpaths.
In that case we could identify the co-energy as:
W = λ( a)dJ · d a
m
area
 
where that area is chosen to cut all of the current carrying conductors. This area can be picked to
be perpedicular to each of the current filaments since the divergence of current is zero. The flux λ
is calculated over a path that coincides with each current filament (such paths exist since current
has zero divergence). Then the flux is:
λ( a) = B · d n
 
A 
Now, if we use the vector potential
for which the magnetic flux density is:
B 
 ×A 
=
the flux linked by any one of the current filaments is:
λ( a) = A · d 
 
d 
where
is the path around the current filament. This implies directly that the coenergy is:
W = A · d d J · d a
m
area J
 
Now: it is possible to make d coincide with d a and be parallel to the current filaments, so that:
W = A · dJ dv
m
vol
 
2.4.2 Permanent Magnets
Permanent magnets are becoming an even more important element in electric machine systems.
Often systemswithpermanent magnetsare approachedina relatively ad-hocway, madeequivalent
to a current that produces the same MMF as the magnet itself.
B 
The constitutive relationship for a permanent magnet relates the magnetic flux density
to
magnetic field H and the property of the magnet itself, the magnetization M .
B = µ 0 H + M 
 
Now, theeffect of themagnetizationistoact asif therewereacurrent(called an amperian current)
with density:
J ∗
 ×M 
=
Note that this amperian current “acts” just like ordinary current in making magnetic flux density.
Magnetic co-energy is:
W = A · × dM dv
m
vol
 
Next, note the vector identity
C ×D 
D 
 ×C −C 
 ×D 
 ·
=
·
·
 
So that:
W = − · A ×dM dv + ×A · dM dv
m
vol vol
 
B 
 ×A 
Then, noting that
=
:
W = − A ×dM d s + B · dM dv
m
vol
 
The first of these integrals (closed surface) vanishes if it is taken over a surface just outside the
M 
magnet, where
is zero. Thus the magnetic co-energy in a system with only a permanent magnet
source is
W = B · dM dv
m
vol
 
Adding current carrying coils to such a system is done in the obvious way.
2.5 Electric Machine Description:
Actually, this description shows a conventional induction motor. This is a very common type of
electric machine and will serve as a reference point. Most other electric machines operate in a
fashion which is the same as the induction machine or which differ in ways which are easy to
reference to the induction machine.
Consider the simplified machine drawing shown in Figure 3. Most (but not all!) machines we
will be studying have essentially this morphology. The rotor of the machine is mounted on a shaft
which is supported on some sort of bearing(s). Usually, but not always, the rotor is inside. I have
drawn a rotor which is round, but this does not need to be the case. I have also indicated rotor
conductors, but sometimes the rotor has permanent magnets either fastened to it or inside, and
sometimes(asinVariableReluctanceMachines)itisjust anoddly shapedpieceof steel. Thestator
is, in this drawing, on the outside and has windings. With most of the machines we will be dealing
with, the stator winding is the armature, or electrical power input element. (In DC and Universal
motors this is reversed, with the armature contained on the rotor: we will deal with these later).
In most electrical machines the rotor and the stator are made of highly magnetically permeable
materials: steel or magnetic iron. In many common machines such as induction motors the rotor
and stator are both made up of thin sheets of silicon steel. Punched into those sheets are slots
which contain the rotor and stator conductors.
Stator
Bearings
Stator
Conductors
Rotor
Air
Gap
Rotor
Shaft Conductors
End Windings
Figure 3: Form of Electric Machine
Figure4isapictureofpart of aninductionmachinedistorted sothattheair-gapisstraightened
out(asif themachinehadinfiniteradius). Thisisactuallyaconvenient way ofdrawing themachine
and, we will find, leads to useful methods of analysis.
What is important to note for now is that the machine has an air gap g which is relatively
small (that is, the gap dimension is much less than the machine radius r). The machine also has a
physical length l. The electric machine works by producing a shear stress in the air-gap (with of
course side effects such as production of “back voltage”). It is possible to define the average air-
gap shear stress, which we will refer to as τ. Total developed torque is force over the surface area
times moment (which is rotor radius):
T = 2πr2 < τ >
Power transferred by this device is just torque times speed, which is the same as force times
surface velocity, since surface velocity is u = rΩ:
P = ΩT = 2πr < τ > u
m
If we note that active rotor volume is πr2 , the ratio of torque to volume is just:
T
=2 < τ >
V
r
Now, determining what can be done in a volume of machine involves two things. First, it is
clear that the volume we have calculated here is not the whole machine volume, since it does not
include the stator. The actual estimate of total machine volume from the rotor volume is actually
quite complex and detailed and we will leave that one for later. Second, we need to estimate the
value of the useful average shear stress. Suppose both the radial flux density Br and the stator
surface current density Kz are sinusoidal flux waves of the form:
√
B r = 2B 0 cos(pθ −ωt)
Stator Core
Stator Conductors
In Slots
Air Gap
Rotor Conductors
In Slots
Figure 4: Windings in Slots
√
K z = 2K 0 cos(pθ −ωt)
Note that this assumes these two quantities are exactly in phase, or oriented to ideally produce
torque, so we are going to get an “optimistic” bound here. Then the average value of surface
traction is:
1 2π
< τ >= B r K z dθ = B 0 K 0
2π 0
 
This actually makes some sense in view of the empirically derived Lorentz Force Law: Given a
(vector) current density and a (vector) flux density. In the absence of magnetic materials (those
with permeability different from that of free space), the observed force on a conductor is:
F 
J 
B 
=
×
Where J is the vector describing current density (A/m2) and B is the magnetic flux density
(T). This is actually enough to describe the forces we see in many machines, but since electric
machines have permeable magnetic material and since magnetic fields produce forces on permeable
material even in the absence of macroscopic currents it is necessary to observe how force appears
on such material. A suitable empirical expression for force density is:
1
F = J ×B − H · H µ
2
 
where H is the magnetic field intensity and µ is the permeability.
Now, note that current density is the curl of magnetic field intensity, so that:
1
F = ×H ×µH − H · H µ
2
 1 
= µ ×H ×H − H · H µ
2
 
And, since:
1
 ×H ×H 
H 
H 
H 
H 
=
· 
− 
·
2
 
force density is:
1 1
F = µ H · H − µ H · H − H · H µ
2 2
 1 
= µ H · H − µ H · H 
2
 
This expression can be written by components: the component of force in the i’th dimension is:
∂ ∂ 1
F = µ H H − µ H2
i k k ∂x k i ∂x i 2 k k 
 
Now, see that we can write the divergence of magnetic flux density as:
∂
 · B = µH = 0
k
∂x
k
k
 
and
∂ ∂ ∂
µ H H = µH H −H µH
k i k i i k
∂x ∂x ∂x
k k k k k k
 
but since the last term in that is zero, we can write force density as:
∂ µ
F = µH H − δ H2
k ∂x i i k 2 ik n n 
 
where we have used the Kroneker delta δ = 1 if i = k, 0 otherwise.
ik
Note that this force density is in the form of the divergence of a tensor:
∂
F = T
k ik
∂x
i
or
F = · T
In this case, force on some object that can be surrounded by a closed surface can be found by
using the divergence theorem:
f = F dv = · Tdv = T · nda
vol vol
 
or, if we note surface traction to be τ = T n , where n is the surface normal vector, then the
i k ik k
total force in direction i is just:
 
f = τ da = T n da
i ik k
s
 k
 
The interpretationof all of thisis lessdifficultthanthe notationsuggests. This field description
of forces gives us a simple picture of surface traction, the force per unit area on a surface. If we just
integrate this traction over the area of some body we get the whole force on the body. Note that
this works if we integrate the traction over a surface that is itself in free space but which surrounds
the body (because we can impose no force on free space).
Note one more thing about this notation. Sometimes when subscripts are repeated as they are
here the summation symbol is omitted. Thus we would write τ = T n = T n .
i k ik k ik k
Now, if we go back to the case of a circular cylinder and are interested in torque, it is pretty
 
clearthat wecancomputethecircumferentialforceby noting thatthenormal vectortothecylinder
is just the radial unit vector, and then the circumferential traction must simply be:
τ θ = µ 0 H r H θ
Simply integrating this over the surface gives azimuthal force, and then multiplying by radius
(moment arm) gives torque. The last step is to note that, if the rotor is made of highly permeable
material, the azimuthal magnetic field is equal to surface current density.
3 Tying the MST and Poynting Approaches Together
Contour Field Region
y
x
Figure 5: Illustrative Region of Space
Now that the stage is set, consider energy flow and force transfer in a narrow region of space as
illustratedby Figure5. The upperand lowersurfacesmay support currents. Assumethat all of the
ej(ωt−kx)
fields, electric and magnetic, are of the form of a traveling wave in the x- direction: Re
.
Ifweassumethatformforthe fieldsand alsoassumethatthereisnovariationinthe z-directio n
(equivalently, the problem is infinitelylong in the z- direction), there can be no x- directed currents
J 
because the divergence of current is zero: ·
= 0. In a magnetostatic system this is true of
E 
electric field
too. Thus we will assume that current is confined to the z- direction and to the two
surfaces illustrated in Figure 5, and thus the only important fields are:
E = i Re E ej(ωt−kx)
z z
H = i Re H ej(ωt−kx) 
x x
+ i Re H ej(ωt−kx) 
y y
 
−∂B 
( ×E 
We may use Faraday’s Law
=
) to establish the relationship between the electric
∂t
and magnetic field: the y- component of Faraday’s Law is:
jkE z = −jωµ 0 H y
or
ω
E z = − k µ 0 H y
The phase velocity u = ω is a most important quantity. Note that, if one of the surfaces is
ph k
moving (as it would be in, say, an induction machine), the frequency and hence the apparent phase
velocity, will be shifted by the motion. We will use this fact shortly.
Energy flow through the surface denoted by the dotted line in Figure 5 is the component of
Poynting’s Vector in the negative y- direction. The relevant component is:
ω
S y = E ×H = E z H x = − µ 0 H y H x
y k
 
Note that this expression contains the xy component of the Maxwell Stress Tensor T =
xy
µ 0 H x H y so that power flow downward through the surface is:
ω
S = −S y = µ 0 H x H y = u ph T xy
k
The average power flow is the same, in this case, for time and for space, and is:
< S >= 1 Re{E H ∗ } = u µ 0 Re H H ∗
z x ph y x
2 2
 
We may choose to define a surface impedance:
E
Z = z
s −H
x
which becomes:
H
y
Z s = −µ 0 u ph H = −µ 0 u ph R
x
where now we have defined the parameter R to be the ratio between y- and x- directed complex
field amplitudes. Energy flow through that surface is now:
1 1
S = − Re{E H ∗ } = Re |H | 2Z
s z x 2 x s
 
4 Simple Description of a Linear Induction Motor
g
j(ω t - k x)
K e
µ zs y
x
µ σ u
s
Figure 6: Simple Description of Linear Induction Motor
The stage is now set for an almost trivial description of a linear induction motor. Consider the
geometrydescribedinFigure6. Shownhereisonly therelativemotiongap region. Thisisbounded
by two regions of highly permeable material (e.g. iron), comprising the stator and shuttle. On the
surface of the stator (the upper region) is a surface current:
K = i Re K ej(ωt−kx)
s z zs
 
The shuttle is, in this case, moving in the positive x- direction at some velocity u. It may also be
described as an infinitely permeable region with the capability of supporting a surface current with
surface conductivity σ , so that K = σ E .
s zr s z
Note that Ampere’s Law gives us a boundary condition on magnetic field just below the upper
surface of this problem: H = K , so that, if we can establish the ratio between y- and x- directed
x zs
fields at that location,
µ µ
< T >= 0 Re H H ∗ = 0 |K | 2 Re{R}
xy y x zs
2 2
 
Note that the ratio of fields H /H = R is independent of reference frame (it doesn’t matter
y x
if we are looking at the fields from the shuttle or the stator), so that the shear stress described by
T is also frame independent. Now, if the shuttle (lower surface) is moving relative to the upper
xy
surface, the velocity of the traveling wave relative to the shuttle is:
ω
u = u −u = s
s ph
k
where we have now defined the dimensionless slip s to be the ratio between frequency seen by the
shuttle to frequency seen by the stator. We may use this to describe energy flow as described by
Poynting’s Theorem. Energy flow in the stator frame is:
S upper = u ph T xy
In the frame of the shuttle, however, it is
S lower = u s T xy = sS upper
Now, the interpretation of this is that energy flow out of the upper surface (S upper) consists of
energy converted (mechanical power) plus energy dissipated in the shuttle (which is S here.
lower
The difference between these two power flows, calculated using Poynting’s Theorem, is power
converted from electrical to mechanical form:
S
= S upper(1−s)
converted
Now, to finish the problem, note that surface current in the shuttle is:
 
K zr = E z σ s = −u s µ 0 σ s H y
 
where the electric field E is measured in the frame of the shuttle.
z
Weassumeherethatthemagneticgap g issmallenough that wemay assume kg 1. Ampere’s
Law, taken around a contour that crosses the air-gap and has a normal in the z- direction, yields:
∂H
x
g = K + K
zs zr
∂x
In complex amplitudes, this is:
−jkgH y = K zs + K zr = K zs −µ 0 u s σ s H y
or, solving for H .
y
jK 1
zs
H =
y kg 1+jµ
u
sσ
s
0
k
g
Average shear stress is
µ0
u
σ
s
s
|2
|2
µ
µ
|K
j
µ
|K
0
0 Re H
0
g
k
z
s
z
s
< T
>=
H
=
Re
=
xy
y
x
µ 0 k u g s σs 
σ s 2
k
g
 1+j
k
g
2
2
2
µ
u
0
s
1+
 kg
 
5 Surface Impedance of Uniform Conductors
The objective of this section is to describe the calculation of the surface impedance presented by a
layerof conductivematerial. Twoproblemsareconsideredhere. The first considersalayerof linear
materialbacked upby aninfinitelypermeablesurface. Thisisapproximatelythesituationpresented
by, for example, surface mounted permanent magnets and is probably a decent approximation to
the conduction mechanism that would be responsible for loss due to asynchronous harmonics in
these machines. It is also appropriate for use in estimating losses in solid rotor induction machines
and in the poles of turbogenerators. The second problem, which we do not work here but simply
present the previously worked solution, concerns saturating ferromagnetic material.
5.1 Linear Case
The situation and coordinate system are shown in Figure 7. The conductive layer is of thicknes T
and has conductivity σ and permeability µ 0. To keep the mathematical expressions within bounds,
we assume rectilinear geometry. This assumption will present errors which are small to the extent
that curvature of the problem is small compared with the wavenumbers encountered. We presume
that the situation is excited, as it would be in an electric machine, by a current sheet of the form
Kej(ωt−kx)
K = Re
z
 
Conductive Slab
H
x
y
x
Permeable Surface
Figure 7: Axial View of Magnetic Field Problem
In the conducting material, we must satisfy the diffusion equation:
∂H
 2H = µ 0 σ
∂t
In view of the boundary condition at the back surface of the material, taking that point to be
y = 0, a general solution for the magnetic field in the material is:
sinhαyej(ωt−kx)
H = Re A
x
 k 
coshαyej(ωt−kx)
H = Re j A
y
α
 
where the coefficient α satisfies:
α2 = jωµ 0 σ + k2
and note that the coefficients above are chosen so that H has no divergence.
Notethatifk issmall(thatis,ifthewavelength of theexcitationislarge),thisspatial coefficient
α becomes
1+j
α =
δ
where the skin depth is:
2
δ =
σ
 ωµ
0
To obtain surface impedance, we use Faraday’s law:
∂B
 ×E = −
∂t
which gives:
ω
E z = −µ 0 k H y
Now: the “surface current” is just
K = −H
s x
so that the equivalent surface impedance is:
E ω
Z = z = jµ 0 cothαT
−H α
x
Apairoflimitsareinterestinghere. Assumingthatthewavelengthislong sothat k isnegligible,
then if αT is small (i.e. thin material),
ω 1
Z → jµ 0 α2T = σT
On the other hand as αT → ∞,
1+j
Z →
σδ
Next it is necessary to transfer this surface impedance across the air-gap of a machine. So, with
reference to Figure 8, assume a new coordinate system in which the surface of impedance Z is
s
located at y = 0, and we wish to determine the impedance Z = −E /H at y = g.
z x
In the gap there is no current, so magnetic field can be expressed as the gradient of a scalar
potential which obeys Laplace’s equation:
H = − ψ
K
y
z
x
g
Surface Impedance Z
s
Figure 8: Impedance across the air-gap
and
2ψ
=0
 
ej(ωt−kx),
we can express H in the gap as:
Ignoring a common factor of
H = jk ψ eky + ψ e −ky
x + −
H = −k ψ eky −ψ e −ky 
y + −
 
At the surface of the rotor,
E = −H Z
z x s
or
−ωµ 0 ψ + −ψ − = jkZ s ψ + + ψ −
 
and then, at the surface of the stator,
E ωψ ekg −ψ e −kg
Z = − H z = jµ 0 k ψ + ekg + ψ − e−kg
x + −
A bit of manipulation is required to obtain:
Z = jµ 0 ω k e ek k g g ( ( ω ω µ µ 0 0 − − j j k k Z Z s s ) )+ −e e − − k k g g ( ( ω ω µ µ 0 0 + + j j k k Z Z s s ) ) 
It is useful to note that, in the limit of Z → ∞, this expression approaches the gap impedance
s
ωµ
0
Z = j
g k2g
and, if the gap is small enough that kg → 0,
Z → Z ||Z
g s
6 Iron
Electric machines employ ferromagnetic materials to carry magnetic flux from and to appropriate
places within the machine. Such materials have properties which are interesting, useful and prob­
lematical, and the designers of electric machines must deal with this stuff. The purpose of this
note is to introduce the most salient properties of the kinds of magnetic materials used in electric
machines.
Wewillbeconcernedherewithmaterialswhich exhibit magnetization: fluxdensityissomething
other than B = µ 0 H . Generally, we will speak of hard and soft magnetic materials. Hard materials
are those in which the magnetization tends to be permanent, while soft materials are used in
magnetic circuits of electric machines and transformers. Since they are related we willfind ourselves
talking about them either at the same time or in close proximity, even though their uses are widely
disparite.
6.1 Magnetization:
It is possible to relate, in all materials, magnetic flux density to magnetic field intensity with a
consitutive relationship of the form:
B = µ 0 H + M 
 
where magnetic field intensity H and magnetization M are the two important properties. Now,
in linear magnetic material magnetization is a simple linear function of magnetic field:
M = χ H 
m
so that the flux density is also a linear function:
B = µ 0 (1+χ m )H 
Note that in the most general case the magnetic susceptibility cm might be a tensor, leading
to flux density being non-colinear with magnetic field intensity. But such a relationship would still
be linear. Generally this sort of complexity does not have a major effect on electric machines.
6.2 Saturation and Hysteresis
Inuseful magneticmaterialsthisnicerelationshipisnot correct and we need to takea moregeneral
view. We will not deal with the microscopic picture here, except to note that the magnetization is
due to the alignment of groups of magnetic dipoles, the groups often called domaines. There are
only so many magnetic dipoles available in any given material, so that once the flux density is high
enough the material is said to saturate, and the relationship between magnetic flux density and
magnetic field intensity is nonlinear.
Shown in Figure 9, for example, is a “saturation curve” for a magnetic sheet steel that is
sometimes used in electric machinery. Note the magnetic field intensity is on a logarithmic scale.
If this were plotted on linear coordinates the saturation would appear to be quite abrupt.
At this point it is appropriate to note that the units used in magnetic field analysis are not
always the same nor even consistent. In almost all systems the unit of flux is the weber (W), which

![이미지](images/page026_img00.webp)

Figure 9: Saturation Curve: Commercial M-19 Silicon Iron
Courtesy of United States Steel Corporation. (U.S. Steel). U.S. Steel accepts no liability for reliance on any
information contained in the graphs shown above.
is the same as a volt-second. In SI the unit of flux density is the tesla (T), but many people refer to
the gauss (G), which has its origin in CGS. 10,000 G = 1 T. Now it gets worse, because there is an
English system measure of flux density generally called kilo-lines per square inch. This is because
in the English system the unit of flux is the line. 108 lines is equal to a weber. Thus a Tesla is 64.5
kilolines per square inch.
The SI and CGS units of flux density are easy to reconcile, but the units of magnetic field
are a bit harder. In SI we generally measure H in amperes/meter (or ampere-turns per meter).
Often, however, you will see magnetic field represented as Oersteds (Oe). One Oe is the same as
the magnetic field required to produce one gauss in free space. So 79.577 A/m is one Oe.
In most useful magnetic materials the magnetic domaines tend to be somewhat “sticky”, and a
more-than-incremental magnetic field is required to get them to move. This leads to the property
called “hysteresis”, both useful and problematical in many magnetic systems.
Hysteresis loops take many forms; a generalized picture of one is shown in Figure 10. Salient
features of the hysteresis curve are the remanent magnetization B and the coercive field H . Note
r c
that the actual loop that will be traced out is a function of field amplitude and history. Thus there
are many other “minor loops” that might be traced out by the B-H characteristic of a piece of
material, depending on just what the fields and fluxes have done and are doing.
Now, hysteresis is important for two reasons. First, it represents the mechanism for “trapping”
magnetic flux in a piece of material to form a permanent magnet. We will have more to say about
that anon. Second, hysteresis is a loss mechanism. To show this, consider some arbitrary chunk of
Flux
Remanent Density
Flux Density B
r
Saturation Flux
Density B
s
Magnetic
Field
Coercive Field
H
c Saturation
Field H
s
Figure 10: Hysteresis Curve Nomenclature
material for which we can characterize an MMF and a flux:
F = NI = H · de ll
 
V
Φ = dt = B · dA 
N Area
 
Energy input to the chunk of material over some period of time is
w = V Idt = FdΦ= H ·d dB · dA dt
t
 
Now, imagine carrying out the second (double) integral over a continuous set of surfaces which
are perpendicular to the magnetic field H. (This IS possible!). The energy becomes:
w = H · dB dvol dt
t
 
and, done over a complete cycle of some input waveform, that is:
w = W dvol
m
vol
 
W = H · dB 
m
t
 
That last expression simply expresses the area of the hysteresis loop for the particular cycle.
Generally, for most electric machine applications we will use magnetic material characterized
as “soft”, having as narrow a hysteresis loop (and therefore as low a hysteretic loss) as possible. At
the other end of the spectrum are “hard” magnetic materials which are used to make permanent
magnets. The terminology comes from steel, in which soft, annealed steel material tends to have
narrowloopsandhardened steel tendstohavewiderloops. Howeverpermanent magnettechnology
has advanced to the point where the coercive forces possible in even cheap ceramic magnets far
exceed those of the hardest steels.
6.3 Conduction, Eddy Currents and Laminations:
Steel, being a metal, is an electrical conductor. Thus when time varying magnetic fields pass
through it they cause eddy currents to flow, and of course those produce dissipation. In fact, for
almost all applications involving “soft” iron, eddy currents are the dominant source of loss. To
reduce the eddy current loss, magnetic circuits of transformers and electric machines are almost
invariablylaminated, or made up of relatively thin sheets of steel. To further reduce lossesthe steel
is alloyed with elements (often silicon) which poison the electrical conductivity.
There are several approaches to estimating the loss due to eddy currents in steel sheets and in
the surface of solid iron, and it is worthwhile to look at a few of them. It should be noted that this
is a “hard” problem, since the behavior of the material itself is difficult to characterize.
6.4 Complete Penetration Case
y
t x
z
Figure 11: Lamination Section for Loss Calculation
Consider the problem of a stack of laminations. In particular, consider one sheet in the stack
represented in Figure 11. It has thickness t and conductivity σ. Assume that the “skin depth”
is much greater than the sheet thickness so that magnetic field penetrates the sheet completely.
Further, assume that the applied magnetic flux density is parallel to the surface of the sheets:
√
B = i z Re 2B 0 ejωt
 
Now we can use Faraday’s law to determine the electric field and therefore current density in
the sheet. If the problem is uniform in the x- and z- directions,
∂E
x = −jω 0 B 0
∂y
Note also that, unless there is some net transport current in the x- direction, E must be anti­
symmetric about the center of the sheet. Thus if we take the origin of y to be in the center, electric
field and current are:
E x = −jωB 0 y
J x = −jωB 0 σy
Local power dissipated is
|J|2
P (y) = ω2B2σy2 =
0
σ
To find average power dissipated we integrate over the thickness of the lamination:
t t
2 2 2 2 2 2 2 1 2 2 2
< P >= P (y)dy = ω B σ y dy = ω B t σ
0 0
t 0 t 0 12
 
Pay attention to the orders of the various terms here: power is proportional to the square of
flux density and to the square of frequency. It is also proportional to the square of the lamination
thickness (this is average volume power dissipation).
As an aside, consider a simple magnetic circuit made of this material, with some length and
area A, so that volume of material is A. Flux lined by a coil of N turns would be:
Λ = NΦ = NAB 0
and voltage is of course just V = jwL. Total power dissipated in this core would be:
1 V 2
P = A ω2B2t2σ =
c 0
12 R
c
where the equivalent core resistance is now
A 12N2
R =
c σt2
6.5 Eddy Currents in Saturating Iron
The same geometry holds for this pattern, although we consider only the one-dimensional problem
(k → 0). The problem was worked by McLean and his graduate student Agarwal [2] [1]. They
assumed that the magnetic field at the surface of the flat slab of material was sinusoidal in time
and of high enough amplitude to saturate the material. This is true if the material has high
permeability and the magnetic field is strong. What happens is that the impressed magnetic field
saturates a region of material near the surface, leading to a magnetic flux density parallel to the
surface. The depth of the region affected changes with time, and there is a separating surface (in
the flat problem this is a plane) that moves away from the top surface in response to the change
in the magnetic field. An electric field is developed to move the surface, and that magnetic field
drives eddy currents in the material.
B
B
0
H
Figure 12: Idealized Saturating Characteristic
AssumethatthematerialhasaperfectlyrectangularmagnetizationcurveasshowninFigure12,
so that flux density in the x- direction is:
B
= B 0sign(H
)
x
x
The flux per unit width (in the z- direction) is:
−∞
Φ = B dy
x
0
 
and Faraday’s law becomes:
∂Φ
E =
z
∂t
while Ampere’s law in conjunction with Ohm’s law is:
∂H
x
= σE
z
∂y
Now, McLean suggested a solution to this set in which there is a “separating surface” at depth ζ
below the surface, as shown in Figure 13 . At any given time:
y
H = H (t) 1+
x s
ζ
 
H
s
J = σE =
z z
ζ
y
x
B s
Separating Surface
B
s
Penetration
Depth
Figure 13: Separating Surface and Penetration Depth
That is, in the region between the separating surface and the top of the material, electric field
E is uniform and magnetic field H isa linearfunctionofdepth, fallingfromitsimpressed valueat
z x
the surface to zero at the separating surface. Now: electric field is produced by the rate of change
of flux which is:
∂Φ ∂ζ
E = = 2B
z x
∂t ∂t
Eliminating E, we have:
∂ζ H
s
2ζ =
∂t σB
x
and then, if the impressed magnetic field is sinusoidal, this becomes:
dζ2 H
0
= |sinωt|
dt σB
0
This is easy to solve, assuming that ζ = 0 at t = 0,
ωt
2H
0
ζ = sin
 ωσB 0 2
Now: the surface always moves in the downward direction (as we have drawn it), so at each half
cycleanewsurfaceiscreated: theold onejust stopsmoving at amaximumposition,orpenetration
depth:
2H
0
δ =
 ωσB
0
This penetration depth is analogous to the “skin depth” of the linear theory. However, it is an
absolute penetration depth.
The resulting electric field is:
ωt
2H
0
E = cos 0 < ωt < π
z
σδ 2
This may be Fourier analyzed: noting that if the impressed magnetic field is sinusoidal, only the
time fundamental component of electric field is important, leading to:
8 H 0
E = (cosωt +2sinωt + ...)
z
3π σδ
Complex surface impedance is the ratio between the complex amplitude of electric and magnetic
field, which becomes:
E 8 1
Z = z = (2+j)
s H 3π σδ
x
Thus, in practical applications, we can handle this surface much as we handle linear conductive
surfaces, by establishing a skin depth and assuming that current flows within that skin depth of
16
the surface. The resistance is modified by the factor of
and the “power factor” of this surface is
3π
about 89 % (as opposed to a linear surface where the “power factor” is about 71 %.
Agarwal suggests using a value for B 0 of about 75 % of the saturation flux density of the steel.
7 Semi-Empirical Method of Handling Iron Loss
Neither of the models described so far are fully satisfactory in describing the behavior of laminated
iron, because losses are a combination of eddy current and hysteresis losses. The rather simple
model employed for eddy currents is precise because of its assumption of abrupt saturation. The
hysteresismodel,whileprecise,wouldrequireanempiricaldeterminationofthesizeofthehysteresis
loops anyway. So we must often resort to empirical loss data. Manufacturers of lamination steel
sheets will publish data, usually in the form of curves, for many of their products. Here are a few
ways of looking at the data.
A low frequency flux density vs. magnetic field (“saturation”) curve was shown in Figure 9.
Included with that was a measure of the incremental permeability
dB
 
µ =
dH
Insome machineapplicationseitherthe “total”inductance(ratiooffluxtoMMF) or “incremental”
inductance(slopeofthe fluxtoMMFcurve)isrequired. Inthelimitoflowfrequencythesenumbers
may be useful.
For designing electric machines, however, a second way of looking at steel may be more useful.
Thisistomeasuretherealand reactivepowerasafunctionof magneticfluxdensity and(sometimes)
frequency. In principal, this data is immediately useful. In any well-designed electric machine the
flux density in the core is distributed fairly uniformly and is not strongly affected by eddy currents,
etc. in the core. Under such circumstances one can determine the flux density in each part of the
core. With that information one can go to the published empirical data for real and reactive power
and determine core loss and reactive power requirements.

![이미지](images/page032_img00.webp)

Figure 14: Real and Apparent Loss: M19, Fully Processed, 29 Ga
Courtesy of United States Steel Corporation. (U.S. Steel). U.S. Steel accepts no liability for reliance on any
information contained in the graphs shown above.
Figure14 showscore lossand “apparent”powerperunit massas afunctionof(RMS)induction
for 29 gage, fully processed M-19 steel. The two left-hand curves are the ones we will find most
useful. “P ” denotes real power while “P ” denotes “apparent power”. The use of this data is quite
a
straightforward. If the flux density in a machine is estimated for each part of the machine and the
mass of steel calculated, then with the help of this chart a total core loss and apparent power can
Table 1: Exponential Fit Parameters for Two Steel Sheets
29 Ga, Fully Processed
M-19 M-36
Base Flux Density B 0 1 T 1 T
Base Frequency f 0 60 Hz 60 Hz
Base Power (w/lb) P 0 0.59 0.67
Flux Exponent 1.88 1.86
B
Frequency Exponent 1.53 1.48
F
Base Apparent Power 1 V A 0 1.08 1.33
Base Apparent Power 2 V A 1 .0144 .0119
Flux Exponent 0 1.70 2.01
Flux Exponent 1 16.1 17.2
be estimated. Then the effect of the core may be approximated with a pair of elements in parallel
with the terminals, with:
q|V |2
R =
c
P
q|V |2
X =
c
Q
Q = P2 −P 2
a
 
Where q is the number of machine phases and V is phase voltage. Note that this picture is, strictly
speaking, only valid for the voltage and frequency for which the flux density was calculated. But
it will be approximately true for small excursions in either voltage or frequency and therefore
useful for estimating voltage drop due to exciting current and such matters. In design program
applications these parameters can be re-calculated repeatedly if necessary.
“Looking up” this data is a it awkward for design studies, so it is often convenient to do a
“curve fit” to the published data. There are a large number of possible ways of doing this. One
method that has bee found to work reasonably well for silicon iron is an “exponential fit”:
B B f F
P ≈ P 0
B f
0
0
 
 
 
This fit is appropriate if the data appears on a log-log plot to lie in approximately straight lines.
Figure 15 shows such a fit for the same steel sheet as the other figures.
For“apparentpower”thesamesort of method canbeused. Itappears,however,thatthesimple
exponential fit which works well for real power is inadequate, at least if relatively high inductions
are to be used. This is because, as the steel saturates, the reactive component of exciting current
rises rapidly. I have had some success with a “double exponential” fit:
B 0 B 1
VA ≈ VA 0 + VA 1
B B
0
0
 
 
 
To first order the reactive component of exciting current will be linear in frequency.
M-19, 29 Ga, Fully Processed
100
10
Flux Density
bL/W
1
,ssoL
0.1 T
0.3 T
0.5 T
0.7 T
0.1
1.0 T
0.01
10 100 1000 10000
Frequency, Hz
Figure 15: Steel Sheet Core Loss Fit vs. Flux Density and Frequency
Inthediskthatistobedistributedwith thesenotesthereareanumberofdata filesrepresenting
properties of different types of nonoriented sheet steel. The format of each of the files is the same:
two columns of numbers, the first is flux density in Tesla, RMS, 60 Hz. The second column is watts
per pound or volt-amperes per pound. The materials are denoted by the file names, which are
generally of the format: “M-Mtype-Proc-Data-Gage.prn”. The coding is relatively dense because
of the short file name limit of MSDOS. Mtype is the number designator (as in M-19). Proc is “f”
for fully processed and “s” for semiprocessed. Data is “p” for power, “pa” for apparent power.
Gage is 29 (.014” thick), 26 (.0185” thick) or 24 (.025” thick). Example: m19fp29.prn designates
loss in M-19 material, fully processed, 29 gage.
Also on the disk are three curve fitting routines that appear to work with this data. (Not all of
the routines work with all of the data!). They are:
1. efit.m implements the single exponential fit of loss against flux density. Use: in MATLAB
type
efit <return>.
The program prompts
fit what (name.prn) ==>
Enter the file name for the material designator without the .prn extension. The program
will think about the problem for a few seconds and put up a plot of its fit with points
noting the actual data. Enter a <return> and a summary of the fit turns up, including the
fit parameters and an error indication. These programs use MATLAB’s fmins routine to
minimize a mean-squared error as calculated by the auxiliary function fiterr.m.
2. e2fit.m implements the double exponential fit of apparent power against flux density. Use
is just like efit. It uses the auxiliary function fit2err.m.
3. pfit.m uses the MATLAB function polyfit to fit a polynomial (in B) to the data.
Most of the machine design scripts enclosed with the material for this special summer subject
employ the exponential fits for core iron developed here.
References
[1] W. MacLean, “Theory of Strong Electromagnetic Waves in Massive Iron”, Journal of Applied
Physics, V.25, No 10, October, 1954
[2] P.D. Agarwal, “Eddy-Current Losses in Solid and Laminated Iron”, Trans. AIEE, V. 78, pp
169-171, 1959

| Non-OrientedSilicon Steels |
| --- |
| AK SteelDi-Max M-19Fully Processed.014 inch(.36 mm, 29 gauge)Summary GraphsMagnetizationCurvesDataCore LossCurvesDataExciting PowerDataSpreadsheetOther Thicknesses.0185 inch.025 inchAK SteelProduct InfoAK Steel Non-Oriented Silicon SteelMenuNon-OrientedSilicon SteelsMenuLamination SteelsMain MenuEMERFL'S' T'E |

LAMINATION STEELS THIRD EDITION
Excerpts specially prepared for the Massachusetts Institute of Technology
by the Electric Motor Education and Research Foundation
Summary Graphs
Magnetization – B vs. H Total Core Loss – P vs. B
c
7500 3500

| 1.5 Tesla1 Tesla | | | | | | | | | | | |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

| | | | 1 T | esla 1.5 | Tesla | |
| --- | --- | --- | --- | --- | --- | --- |

25000
20000 1000
15000 1000
10000 100
100
5000
10
10
1
1
1000 0.1
0.1
500
0.01
B
– sessuaG
cP –
0.01
cP
margoliK
–
dnuoP
0.001
ni
ytisneD
0.001
rep
rep
100 0.0001
sttaW
sttaW
xulF
0.0001
ni
ni
citengaM
ssoL
ssoL
40 0.00001
eroC
eroC
0.00001
0.001 0.01 0.1 1 10 100 1000 0 1000 5000 10000 15000 20000
Mag 0. n 1 e tizing Force in Oer 1 st eds – H 10 100 1000 10000 100000 Magnetic Flux Density in Gausses – B
Magnetizing Force in Amperes per Meter – H
Magnetization curves for this material, DC through 2000 hertz Total core loss curves for this material, 50 through 2000 hertz
All non-oriented silicon steels All non-oriented silicon steels
All other materials All other materials
Summary magnetization and total core loss curves for as-sheared .014 inch (.36 mm, 29 gauge) Di-Max M-19 fully processed cold-rolled non-oriented silicon steel showing their
relation to these properties for other materials found in Lamination Steels Third Edition. See the following pages for detailed graphs and data values.
Producer: AK Steel, Middletown, Ohio, USA, www.aksteel.com.
Primary standard: ASTM A677 36F155.
Information on this page is not guaranteed or endorsed by The Electric Motor Education and Research Foundation. Confirm material properties with material producer prior to
use. © 2007 The Electric Motor Education and Research Foundation. MIT OCW excerpts prepared October 2008.
This and the following five pages are excerpted from the Laminations Steels Third Edition CD-ROM published by the Electric Motor Education
and Research Foundation and are intended for use in the Massachusetts Institute of Technology OpenCourseWare program. Unauthorized
duplication and distribution of this document in violation of the OpenCourseWare license is prohibited. Incorporation of this information in
other publications or software, in whole or in part, in violation of the OpenCourseWare license or without specific authorization from Electric
Motor Education and Research Foundation, is prohibited.
Courtesy of the Electric Motor Education and Research Foundation. Used with permission.
Please use the following citation when referring to these pages:
Sprague, Steve, editor. 2007. Lamination Steels Third Edition, A Compendium of Lamination Steel Alloys Commonly Used in Electric Motors.
South Dartmouth, Massachusetts: The Electric Motor Education and Research Foundation. CD-ROM. Non-Oriented Silicon Steels: AK Steel
Di-Max M-19, Fully Processed, .014 inch (.36 mm, 29 gauge), MIT OCW Excerpts.
Lamination Steels Third Edition is © 2007 by the Electric Motor Education and Research Foundation; ISBN 0971439125. Information about the
complete CD-ROM can obtained from:
The Electric Motor Education and Research Foundation, Post Office Box P182, South Dartmouth, Massachusetts 02748 USA
tel: 508.979.5935 fax: 508.979.5845 email: info@smma.org www.smma.org

| Non-OrientedSilicon Steels |
| --- |
| AK SteelDi-Max M-19Fully Processed.014 inch(.36 mm, 29 gauge)MagnetizationCurvesSummary GraphsMagnetizationDataCore LossCurvesDataExciting PowerDataSpreadsheetOther Thicknesses.0185 inch.025 inchAK SteelProduct InfoAK Steel Non-Oriented Silicon SteelMenuNon-OrientedSilicon SteelsMenuLamination SteelsMain MenuEMERFL' S' T' E |

LAMINATION STEELS THIRD EDITION
Excerpts specially prepared for the Massachusetts Institute of Technology
by the Electric Motor Education and Research Foundation
Magnetization – B vs. H – by Frequency
22000

| | | | | | | | | | | | | | | | | | | | | | | | | | | 21000 20000 | | | | | | | | | | | 21000 20000 | G | | | | | | | | | | | | | | |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | | | | | | | | | | | | | | | | | | 21000 20000 | | | | | | | | | | | 21 | 000 | | | | | | | | | | | | | | |
| | | | | | | | 15000 | G | G | | | | | | | | | | | | | | | | | 20000 19000 18000 1177000000 16000 15000 | | | | | | | | | | | 20 | 000 | | DC | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | | | | | | | | | 19000 18000 | | | | | | | | | | | 19 | 000 | | | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | | | | | | | | | 18000 1177000000 | | | | | | | | | | | 18 | 000 | | DC | | | | | | | | | | | | |
| | | | | | | | | | | | | | | | | | | | | | | | | | | 1177000000 16000 | | | | | | | | | | | 1177 | 000000 | | | | | | | | | | | | | | |
| | | 15000 | | | | | 15000 | G 15000 | G | | | | | | | | | | | | | | | | | 16000 15000 | | | | | | | | | | | 16 | 000 | | | | | | | | | | | | | | |
| 1.5 Tesl | a | 1514131211 | | | | | 15000 14000 13000 12000 11000 10000 | 000 | 5 6 0 0 100 150 200 300 | 50 | | | 400 600 | 600 | 1000 | 1000 | DC 1500 | DC 1500 | 2000 | Hertz | Hertz | | 1 | 0 | 1000 | 1515 20 25 30 35 40 50 60 70 80 90 1000 1500 2000 3000 4000 5000 6000 80 | | | | | | | | | | | 15000 90 8 1 0 0 0 0 0 | 0000 1200 10 | | 5 150 200 250 300 350 400 500 600 700 800 10000 15000 20000 30000 40000 50000 60000 80 | | | | | | | | | | | | 00 Oe000 A/m |
| | | 14000 13000 | | | | | 14000 13000 | 000 | 6 0 | 60 | | | | | | | | DC | | | | | 8 | 00 | 10 | 1000 150 0 2 0 0 0 3 00 0 4 0 0 0 5 0 00 6 00 0 8 0 0 0 | | | | | | | | | | | 8 0 0 0 | 8 0 0 0 1 | | 1 0 0 0 0 150 0 0 2 0 0 0 0 3 0 0 0 0 4 0 0 0 0 5 0 0 00 6 0 0 0 0 8 0 0 0 | | | | | | | | | | | | 8 0 0 0 0 A / m |
| | | 13000 12000 | | | | | 13000 12000 | 000 | 11 | 0050 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 12000 11000 | | | | | 12000 11000 | 000 | 2 | 00 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 11000 10000 | | | | | 11000 10000 | 000 | 3 | 00 | | | 400 60 | 0 | 100 | 0 | 150 | 0 | 2000 | Her | tz | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| 1 Tesl | a | 30 | 0.4 0.5 0. | 6 0 | .7 | 0.8 0 | 10.9 1 | 000 | 1. | 25 1.5 | | 1. 1 5 2 5 150 2 | 2 2. | 5 3 | 3 | .5 | 4 | 5 | 6 | 7 | 7 600 8 | 8 | 9 1 | 0 | 1000 | O e00 A/m | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 30 35 4 0 5 0 60 7 0 98 0 9000 | 35 40 | 50 | 60 | 7 | 0 98 | 500 0 9 | 0 1 | 00 1 | | 25 15 | 0 2 | 00 2 | 50 | 30 | 0 35 | 0 4 | 00 5 | 00 | 60 | 0 70 | 0 8 | 00 | 10 | 1000 A / m | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 9000 8500 | | | | | 9 | 000 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 8500 8000 | | | | | 8 | 500 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 8000 7500 | | | | | 8 | 000 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 7500 7000 | | | | | 7 | 500 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 7000 DC 6500 | | | D | C | 7 | 000 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 6500 6000 | | | | | 6 | 500 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 6000 5500 | | | | | 6 | 000 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 5500 5000 | | | | | 5 | 500 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | | | | | | 5 | 000 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 4500 4000 | | | | | 4 | 500 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 4000 3500 | | | | | 4 | 000 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 3500 3000 | | | | | 3 | 500 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 3000 2500 | | | | | 32 | 000500 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 2500 2000 | | | | | 2500 2000 | 2500 2000 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 2DC | | | | | 2000 | 000 | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | |
| | | 50 60 100 150 200 300 400 | | | | | 400 | 60 | 600 | 0 1000 1500 2000 Frequency in | | | | | | | | | | | | | in | Hert | Hertz | z | | | | | | | | | | | | | | | | | | | | | | | | | | |

20000
15000
10000
5000
B
–
sessuaG
ni
2000
ytisneD
xulF
citengaM
1000
0.1 1 10 100 1000
10 100 1000 10000 100000
Magnetizing Force in Oersteds – H
Magnetizing Force in Amperes per Meter – H
Typical DC and derived AC magnetizing force of as-sheared .014 inch (.36 mm, 29 gauge) Di-Max M-19 fully processed cold-rolled non-oriented silicon steel.
See magnetization data page for data values. DC curve developed from published and AC curves from previously unpublished data for Di-Max M-19 provided
by AK Steel, 2000. AC magnetization data derived from exciting power data; see exciting power data page for source data and magnetization data page for
conversion information. Chart prepared by EMERF, 2004. Information on this page is not guaranteed or endorsed by The Electric Motor Education and
Research Foundation. Confirm material properties with material producer prior to use. © 2007 The Electric Motor Education and Research Foundation. MIT
OCW excerpts prepared October 2008.
This page is excerpted from the Laminations Steels Third Edition CD-ROM published by the Electric Motor Education and
Research Foundation and is intended for use in the Massachusetts Institute of Technology OpenCourseWare program. Unau­
thorized duplication and distribution of this document in violation of the OpenCourseWare license is prohibited. Please refer
to the Summary Graphs page, reached by the link at left, for additional information concerning this document.

| Non-OrientedSilicon Steels |
| --- |
| AK SteelDi-Max M-19Fully Processed.014 inch(.36 mm, 29 gauge)MagnetizationDataSummary GraphsMagnetizationCurvesCore LossCurvesDataExciting PowerDataSpreadsheetOther Thicknesses.0185 inch.025 inchAK SteelProduct InfoAK Steel Non-Oriented Silicon SteelMenuNon-OrientedSilicon SteelsMenuLamination SteelsMain MenuEMERFL' S' T' E |

LAMINATION STEELS THIRD EDITION
Excerpts specially prepared for the Massachusetts Institute of Technology
by the Electric Motor Education and Research Foundation
Magnetization – B vs. H
DC and Derived AC Magnetizing Force in Oersteds and Amperes per Meter at Various Frequencies – H
Oe A/m
DC 50 Hz 60 Hz 100 Hz 150 Hz 200 Hz 300 Hz 400 Hz 600 Hz 1000 Hz 1500 Hz 2000 Hz

| 0.333 26.5 0.334 26.6 0.341 27.1 0.349 27.8 0.356 28.3 0.372 29.6 0.385 30.6 0.412 32.8 0.485 38.6 0.564 44.9 0.642 51.10.401 31.9 0.475 37.8 0.480 38.2 0.495 39.4 0.513 40.8 0.533 42.4 0.567 45.1 0.599 47.7 0.661 52.6 0.808 64.3 0.955 76.0 1.09 86.90.564 44.9 0.659 52.4 0.669 53.2 0.700 55.7 0.739 58.8 0.777 61.8 0.846 67.3 0.911 72.5 1.04 82.8 1.30 103 1.56 124 1.80 1430.845 67.3 0.904 71.9 0.916 72.9 0.968 77.0 1.03 82.0 1.09 87.1 1.21 96.4 1.33 105 1.55 124 2.00 159 2.48 198 2.95 2351.34 106 1.25 99.3 1.26 101 1.32 105 1.40 112 1.48 118 1.65 131 1.82 145 2.17 173 2.87 228 3.70 294 4.53 361 | | | | |
| --- | --- | --- | --- | --- |
| 2.06 164 1.71 136 1.72 137 1.78 141 1.86 148 1.94 155 2.13 169 2.33 185 2.74 218 3.66 291 4.77 380 5.89 4692.95 235 2.21 176 2.22 177 2.27 181 2.34 186 2.42 193 2.61 208 2.82 224 3.24 258 4.27 340 5.50 4385.47 435 3.51 279 3.51 279 3.57 284 3.63 289 3.69 294 3.86 307 4.13 32913.9 1109 8.28 659 8.31 662 8.37 666 8.37 666 8.48 675 8.65 689 9.74 775 | | | | |
| 2.95 235 2.21 176 2.22 177 2.27 181 2.34 186 2.42 193 2.61 208 2.82 224 3.24 258 4.27 340 5.50 438 | | | | |
| 5.47 435 3.51 279 3.51 279 3.57 284 3.63 289 3.69 294 3.86 307 4.13 329 | | | | |
| 13.9 1109 8.28 659 8.31 662 8.37 666 8.37 666 8.48 675 8.65 689 9.74 775 | | | | |
| 22.8 1813 13.6 1084 13.6 1081 13.8 1095 13.7 1092 13.8 1096 14.1 1122 16.5 131335.2 2802 21.6 1718 21.7 1728 21.8 1735 21.8 1738 21.9 174250.9 4054 32.4 2577 32.5 2587 32.6 2597 32.5 2590 32.6 259470.3 5592 46.1 3670 46.2 3680 46.4 3692 46.6 3712 46.6 3711122 9711202 16044394 313191112 88491 | | | | |
| 35.2 2802 21.6 1718 21.7 1728 21.8 1735 21.8 1738 21.9 1742 | | | | |
| 50.9 4054 32.4 2577 32.5 2587 32.6 2597 32.5 2590 32.6 2594 | | | | |
| 70.3 5592 46.1 3670 46.2 3680 46.4 3692 46.6 3712 46.6 3711 | | | | |

1000
B
–
sessuaG
2000
4000
ni
7000
ytisneD
10000
xulF
12000
citengaM
13000
14000
15000
15500
16000
16500
17000
18000
19000
20000
21000
Typical DC and derived AC magnetizing force of as-sheared .014 inch (.36 mm, 29 gauge) Di-Max M-19 fully processed cold-rolled non-oriented silicon steel. DC values in
Oersteds from published AK Steel documents. AC values in Oersteds developed from previously unpublished exciting power information provided by AK Steel, 2000. AC values
have been derived from RMS Exciting Power using the following formulas:
88.19 × Density (g/cc) × RMS Exciting Power (VA/lb)
Magnetizing Force in Oersteds =
Magnetic Flux Density (kG) × Frequency (Hz)
Density of M-19 = 7.65 g/cc
Values in Amperes per meter = Oersteds × 79.58
See exciting power data page for AC exciting power source data. Magnetizing force formula developed by AK Steel; use only for deriving magnetizing force of AK Steel non-
oriented silicon steel. Data table preparation, including conversion of data values, by EMERF, 2004.
Information on this page is not guaranteed or endorsed by The Electric Motor Education and Research Foundation. Confirm material properties with material producer prior to
use. © 2007 The Electric Motor Education and Research Foundation. MIT OCW excerpts prepared October 2008.
This page is excerpted from the Laminations Steels Third Edition CD-ROM published by the Electric Motor Education and Research Founda­
tion and is intended for use in the Massachusetts Institute of Technology OpenCourseWare program. Unauthorized duplication and distribu­
tion of this document in violation of the OpenCourseWare license is prohibited. Please refer to the Summary Graphs page, reached by the link
at left, for additional information concerning this document.

| Non-OrientedSilicon Steels |
| --- |
| AK SteelDi-Max M-19Fully Processed.014 inch(.36 mm, 29 gauge)Core LossCurvesSummary GraphsMagnetizationCurvesDataCore LossDataExciting PowerDataSpreadsheetOther Thicknesses.0185 inch.025 inchAK SteelProduct InfoAK Steel Non-Oriented Silicon SteelMenuNon-OrientedSilicon SteelsMenuLamination SteelsMain MenuEMERFL' S' T' E |

LAMINATION STEELS THIRD EDITION
Excerpts specially prepared for the Massachusetts Institute of Technology
by the Electric Motor Education and Research Foundation
Total Core Loss – P vs. B – by Frequency
c
200

| | | | | W/kg 400 | | | | | | | | | | | | | |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | 350300 | | | | | 175 W/lb | 2000 | | | | | | | |
| | | | | | | | | | 150 | 2000 | | | | | | | |
| | | | | | | | | 275 | 125 | | | | | | | | |
| | | | | | | | | 250225 | | | | | | | | | |
| | | | | | | | | | 100 | | | | | | | | |
| | | | | | | | | 200 | 90 | 1500 | | | | | | | |
| | | | | | | | | 175 | 8070 | | | | | | | | |
| | | | | | | | | 150 | 60 | | | | | | | | |
| | | | | | | | | 125 | | | | | | | | | |
| | | 1 0 0 | 1 0 0 | | | | | | 50 | | | | | | | | |
| | | 100908070605040353025 | | 40 35 30 25 1 2 8 0 16 14 1 1 0 2 | | | | 10090 | 4 0 35 30 25 1 2 8 0 16 14 1 1 0 2 | 1000 | | | | | | | |
| | | 9 0 80 | 9 0 80 | 40 | | | | 80 | 40 | | | | | | | | |
| | | 80 70 | 80 70 | 35 | | | | 70 | 35 | | | | | | | | |
| | | 60 | 60 | 30 | | | | 60 | 30 | | | | | | | | |
| | | 50 | | 25 | | | | | 25 | | | | | | | | |
| | | 50 | 50 | | | | | 50 | | | | | | | | | |
| | | 40 | | 20 | | | | | 20 | 600 | | | | | | | |
| | | 40 35 | 40 | 18 | | | | 40 | 18 | | | | | | | | |
| | | 35 | 35 | 1614 | | | | 35 | 1614 | | | | | | | | |
| | | 30 | 30 | 12 | | | | 30 | 12 | | | | | | | | |
| | | 25 | 25 | | | | | 25 | | | | | | | | | |
| | | 3000 | 20 18 4000 1 1 4 6 5000 12 10 | 10 | 6000 7000 | 7000 8000 | 8000 9000 | 20 18 9000 1 1 4 6 100006 12 10 | 10 | 400 | 12000 13000 | 13000 14000 15000 | 14000 15000 | 15000 16000 17000 18000 G | 16000 17000 | 17000 18000 | 000 G |
| | | 20 18 | 2018 | | | | | 2018 | | | | | | | | | |
| | | 18 1 6 | | 8 | | | | | 8 | | | | | | | | |
| | | 3000 4000 1 1 4 6 5000 | 164000 14 50 | 00 60 | 00 70 | 00 80 | 00 90 | 1600 14 10 | 000 11 | 000 300 12 | 000 13 | 000 14 | 000 15 | 000 16 | 000 17 | 000 18 | 18000 G |
| | | 12 | | 6 | | | | | 6 | | | | | | | | |
| | | 12 10 | 12 | | | | | 12 | | | | | | | | | |
| 2000 | | 10 8 6 4 | 10 | 4 2 1 | | | | 10 | 4 2 1 | 200 150 100 | | | | | | | |
| | | 8 | | 4 | | | | | 4 | | | | | | | | |
| | | 8 6 | 8 | | | | | 8 | | 200 | | | | | | | |
| | | 6 | 6 | | | | | 6 | | 150 | | | | | | | |
| | | 4 | | 2 | | | | | 2 | | | | | | | | |
| 2000 | | 4 | 4 | | | | | 4 | | 100 | | | | | | | |
| 1500 | | 2 1 | 2 1 | 1 | | | | 2 1 | 1 | 60 50 Hertz | | | | | | | |
| | | 2 | 2 | | | | | 2 | | | | | | | | | |
| | | | | 0.8 | | | | | 0.8 | 60 | | | | | | | |
| | | 1 | | 0.6 | | | | | 0.6 | 50Hertz | | | | | | | |
| 1000600400 | | 1 0.8 0.6 0.4 | 1 | 0.4 0.2 0.1 | | | | 1 | 0.40.2 | | | | | | | | |
| | | 0.8 | | 0.4 | | | | | 0.4 | | | | | | | | |
| | | 0.8 0.6 | 0.8 | | | | | 0.8 | | | | | | | | | |
| | | 0.6 | 0.6 | | | | | 0.6 | 0.2 | | | | | | | | |
| | | 0.4 | | 0.2 | | | | | 0.2 | | | | | | | | |
| 400 | | 0.4 | 0.4 | | | | | 0.4 | | | | | | | | | |
| 300 | | 0.2 0.1 | 0.2 0.1 | 0.10.080.06 | | | | | | | | | | | | | |
| | | 0.2 | 0.2 | 0.08 | | | | | | | | | | | | | |
| 300 | | | | 0.08 | | | | | | | | | | | | | |
| | | | | 0.06 | | | | | | | | | | | | | |
| | | 0.1 | | 0.06 | | | | | | | | | | | | | |
| 200150100 | | 0.1W/kg | 0.1 | 0.04W/lb | | | | | | | | | | | | | |
| 60 | | | | | | | | | | | | | | | | | |
| 50Frequ | ency in | Hertz | | 1 T | | | | | esla | | | 1.5 | | Tesla | | | |

400
100
200
100
10
10
1
1
c
P
c
–
P
margoliK
–
dnuoP
0.1
rep
rep
sttaW
sttaW
0.1
ni
ni
ssoL
ssoL
eroC
eroC
0.01
0.02
1000 2000 5000 10000 15000 19000
Magnetic Flux Density in Gausses – B
Typical total AC core loss of as-sheared .014 inch (.36 mm, 29 gauge) Di-Max M-19 fully processed cold-rolled non-oriented silicon steel. See core loss data
page for data values. Curves developed from previously unpublished information provided by AK Steel, 2000. Chart prepared by EMERF, 2004.
Information on this page is not guaranteed or endorsed by The Electric Motor Education and Research Foundation. Confirm material properties with material
producer prior to use. © 2007 The Electric Motor Education and Research Foundation. MIT OCW excerpts prepared October 2008.
This page is excerpted from the Laminations Steels Third Edition CD-ROM published by the Electric Motor Education and
Research Foundation and is intended for use in the Massachusetts Institute of Technology OpenCourseWare program. Unau­
thorized duplication and distribution of this document in violation of the OpenCourseWare license is prohibited. Please refer
to the Summary Graphs page, reached by the link at left, for additional information concerning this document.

| Non-OrientedSilicon Steels |
| --- |
| AK SteelDi-Max M-19Fully Processed.014 inch(.36 mm, 29 gauge)Core LossDataSummary GraphsMagnetizationCurvesDataCore LossCurvesExciting PowerDataSpreadsheetOther Thicknesses.0185 inch.025 inchAK SteelProduct InfoAK Steel Non-Oriented Silicon SteelMenuNon-OrientedSilicon SteelsMenuLamination SteelsMain MenuEMERFL' S' T' E |

LAMINATION STEELS THIRD EDITION
Excerpts specially prepared for the Massachusetts Institute of Technology
by the Electric Motor Education and Research Foundation
Total Core Loss – P vs. B
c
Core Loss in Watts per Pound and Watts per Kilogram at Various Frequencies – P
c
W/lb W/kg
50 Hz 60 Hz 100 Hz 150 Hz 200 Hz 300 Hz 400 Hz 600 Hz 1000 Hz 1500 Hz 2000 Hz

| 0.008 0.0176 0.009 0.0198 0.017 0.0375 0.029 0.0639 0.042 0.0926 0.074 0.163 0.112 0.247 0.205 0.452 0.465 1.02 0.9 1.98 1.45 3.200.031 0.0683 0.039 0.0860 0.072 0.159 0.119 0.262 0.173 0.381 0.300 0.661 0.451 0.994 0.812 1.79 1.79 3.94 3.37 7.43 5.32 11.70.109 0.240 0.134 0.295 0.252 0.555 0.424 0.934 0.621 1.37 1.09 2.39 1.64 3.60 2.96 6.52 6.34 14.0 11.8 26.1 18.5 40.80.273 0.602 0.340 0.749 0.647 1.43 1.11 2.44 1.64 3.61 2.92 6.44 4.45 9.81 8.18 18.0 17.8 39.1 33.7 74.3 54.0 1190.494 1.09 0.617 1.36 1.18 2.61 2.04 4.50 3.06 6.74 5.53 12.2 8.59 18.9 16.2 35.7 36.3 80.0 71.5 158 117 257 | | | |
| --- | --- | --- | --- |
| 0.687 1.51 0.858 1.89 1.65 3.63 2.86 6.30 4.29 9.46 7.83 17.3 12.2 26.9 23.5 51.8 54.3 120 109 240 179 3950.812 1.79 1.01 2.23 1.94 4.28 3.36 7.41 5.06 11.2 9.23 20.3 14.4 31.8 27.8 61.3 65.1 143 132 2910.969 2.14 1.21 2.66 2.31 5.09 4.00 8.82 6.00 13.2 10.9 24.1 17.0 37.51.16 2.56 1.45 3.19 2.77 6.11 4.76 10.5 7.15 15.8 13.0 28.7 20.1 44.4 | | | |
| 0.812 1.79 1.01 2.23 1.94 4.28 3.36 7.41 5.06 11.2 9.23 20.3 14.4 31.8 27.8 61.3 65.1 143 132 291 | | | |
| 0.969 2.14 1.21 2.66 2.31 5.09 4.00 8.82 6.00 13.2 10.9 24.1 17.0 37.5 | | | |
| 1.16 2.56 1.45 3.19 2.77 6.11 4.76 10.5 7.15 15.8 13.0 28.7 20.1 44.4 | | | |
| 1.26 2.77 1.56 3.44 2.99 6.59 5.15 11.4 7.71 17.0 13.9 30.7 21.6 47.61.34 2.96 1.67 3.67 3.18 7.01 5.47 12.0 8.19 18.01.42 3.13 1.76 3.89 3.38 7.44 5.79 12.8 8.67 19.11.49 3.29 1.85 4.08 3.54 7.80 6.09 13.4 9.13 20.12.00 4.40 | | | |
| 2.00 4.40 | | | |

1000
B
–
sessuaG
2000
4000
ni
7000
ytisneD
10000
xulF
12000
citengaM
13000
14000
15000
15500
16000
16500
17000
18000
Typical total AC core loss of as-sheared .014 inch (.36 mm, 29 gauge) Di-Max M-19 fully processed cold-rolled non-oriented silicon steel. Watts per pound
values from previously unpublished information provided by AK Steel, 2000. Data table preparation, including conversion of data values, by EMERF, 2004.
Watts per kilogram values developed using this formula: Watts per Kilogram = Watts per Pound × 2.204 .
Information on this page is not guaranteed or endorsed by The Electric Motor Education and Research Foundation. Confirm material properties with material
producer prior to use. © 2007 The Electric Motor Education and Research Foundation. MIT OCW excerpts prepared October 2008.
This page is excerpted from the Laminations Steels Third Edition CD-ROM published by the Electric Motor Education and
Research Foundation and is intended for use in the Massachusetts Institute of Technology OpenCourseWare program. Unau­
thorized duplication and distribution of this document in violation of the OpenCourseWare license is prohibited. Please refer
to the Summary Graphs page, reached by the link at left, for additional information concerning this document.

| Non-OrientedSilicon Steels |
| --- |
| AK SteelDi-Max M-19Fully Processed.014 inch(.36 mm, 29 gauge)Exciting PowerDataSummary GraphsMagnetizationCurvesDataCore LossCurvesDataSpreadsheetOther Thicknesses.0185 inch.025 inchAK SteelProduct InfoAK Steel Non-Oriented Silicon SteelMenuNon-OrientedSilicon SteelsMenuLamination SteelsMain MenuEMERFL' S' T' E |

LAMINATION STEELS THIRD EDITION
Excerpts specially prepared for the Massachusetts Institute of Technology
by the Electric Motor Education and Research Foundation
Exciting Power
Exciting Power in Volt-amps per Pound and Volt-amps per Kilogram at Various Frequencies
V-A/lb V-A/kg
50 Hz 60 Hz 100 Hz 150 Hz 200 Hz 300 Hz 400 Hz 600 Hz 1000 Hz 1500 Hz 2000 Hz

| 0.025 0.055 0.030 0.066 0.051 0.112 0.078 0.172 0.106 0.234 0.165 0.364 0.228 0.503 0.366 0.807 0.719 1.58 1.25 2.76 1.90 4.200.07 0.154 0.085 0.187 0.147 0.324 0.228 0.503 0.316 0.696 0.504 1.11 0.710 1.56 1.18 2.59 2.40 5.28 4.25 9.36 6.48 14.30.195 0.430 0.238 0.525 0.415 0.915 0.657 1.45 0.921 2.03 1.51 3.32 2.16 4.76 3.70 8.15 7.70 17.0 13.9 30.5 21.4 47.10.469 1.03 0.57 1.26 1.00 2.21 1.60 3.53 2.27 5.00 3.77 8.31 5.50 12.1 9.67 21.3 20.8 45.7 38.7 85.2 61.3 1350.925 2.04 1.12 2.48 1.96 4.32 3.12 6.88 4.39 9.68 7.33 16.2 10.8 23.8 19.3 42.5 42.5 93.7 82.2 181 134 296 | | | |
| --- | --- | --- | --- |
| 1.52 3.34 1.83 4.04 3.16 6.96 4.96 10.9 6.91 15.2 11.4 25.0 16.6 36.5 29.2 64.4 65.1 143 127 280 210 4622.13 4.69 2.57 5.66 4.38 9.65 6.77 14.9 9.34 20.6 15.1 33.2 21.7 47.8 37.5 82.7 82.3 181 159 3503.64 8.02 4.37 9.63 7.41 16.3 11.3 24.9 15.3 33.8 24.0 52.9 34.3 75.69.20 20.3 11.1 24.4 18.6 41.0 27.9 61.5 37.7 83.1 57.7 127 86.6 191 | | | |
| 2.13 4.69 2.57 5.66 4.38 9.65 6.77 14.9 9.34 20.6 15.1 33.2 21.7 47.8 37.5 82.7 82.3 181 159 350 | | | |
| 3.64 8.02 4.37 9.63 7.41 16.3 11.3 24.9 15.3 33.8 24.0 52.9 34.3 75.6 | | | |
| 9.20 20.3 11.1 24.4 18.6 41.0 27.9 61.5 37.7 83.1 57.7 127 86.6 191 | | | |
| 15.6 34.5 18.7 41.3 31.6 69.6 47.3 104 63.3 140 97.2 214 152 33425.6 56.4 30.9 68.1 51.7 114 77.7 171 104 22939.6 87.3 47.7 105 79.8 176 119 263 159 35158.1 128 69.9 154 117 258 176 389 235 518 | | | |

1000
B
–
sessuaG
2000
4000
ni
7000
ytisneD
10000
xulF
12000
citengaM
13000
14000
15000
15500
16000
16500
17000
Typical RMS Exciting Power of as-sheared .014 inch (.36 mm, 29 gauge) Di-Max M-19 fully processed cold-rolled non-oriented silicon steel. Volt-amps per
pound values from previously unpublished information provided by AK Steel, 2000. Data table preparation, including conversion of data values, by EMERF,
2004.
Volt-amps per kilogram developed using this formula: Volt-amps per kilogram = Volt-amps per pound × 2.204 .
Information on this page is not guaranteed or endorsed by The Electric Motor Education and Research Foundation. Confirm material properties
with material producer prior to use. © 2007 The Electric Motor Education and Research Foundation. MIT OCW excerpts prepared October 2008.
This page is excerpted from the Laminations Steels Third Edition CD-ROM published by the Electric Motor Education and
Research Foundation and is intended for use in the Massachusetts Institute of Technology OpenCourseWare program. Unau­
thorized duplication and distribution of this document in violation of the OpenCourseWare license is prohibited. Please refer
to the Summary Graphs page, reached by the link at left, for additional information concerning this document.
Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes Chapter 9
Synchronous Machine and Winding Models ∗
J.L. Kirtley Jr.
1 Introduction
The objective here is to develop a simple but physically meaningful model of the synchronous
machine, one of the major classes of electric machine. We can look at this model from several
different directions. This will help develop an understanding of analysis of machines, particularly
in cases where one or another analytical picture is more appropriate than others. Both operation
and sizing will be of interest here.
Along the way we will approach machine windings from two points of view. On the one hand,
we will approximate windings as sinusoidal distributions of current and flux linkage. Then we will
take a concentrated coil point of view and generalize that into a more realistic and useful winding
model.
2 Physical Picture: Current Sheet Description
Consider this simple picture. The ‘machine’ consists of a cylindrical rotor and a cylindrical stator
which are coaxial and which have sinusoidal current distributions on their surfaces: the outer
surface of the rotor and the inner surface of the stator.
The ‘rotor’ and ‘stator’ bodies are made of highly permeable material (we approximate this as
being infinite for the time being, but this is something that needs to be looked at carefully later).
We also assume that the rotor and stator have current distributions that are axially (z) directed
and sinusoidal:
KS = K cospθ
z S
KR = K cosp (θ −φ)
z R
Here, the angle φ is the physical angle of the rotor. The current distribution on the rotor goes
along. Now: assume that the air-gap dimension g is much less than the radius: g << R. It is not
∗ c2003 James L. Kirtley Jr.

![이미지](images/page043_img00.webp)

Figure 1: Elementary Machine Model: Axial View
difficult to show that with this assumption the radial flux density Br is nearly uniform across the
gap (i.e. not a function of radius) and obeys:
Then the radial magnetic flux density for this case is simply:
Now it is possible to compute the traction on rotor and stator surfaces by recognizing that
the surface current distributions are the azimuthal magnetic fields: at the surface of the stator,
HQ = -K:, and at the surface of the rotor, HQ = K;. So at the surface of the rotor, traction is:
TO= Tro = -- PoR (Ks sinp0 + KRs inp (0 -4)) KR cosp (0 - 4)
Pg
The average of that is simply:
The same exercise done at the surface of the stator yields the same results (with opposite sign).
To find torque, use:
We can pause here to make a few observations:
1. For a given value of surface currents Ks and Kr, torque goes as the fourth power of linear
dimension. The volume of the machine goes as the third power, so this implies that torque
capability goes as the 413 power of machine volume. Actually, this understates the situation
since the assumed surface current densities are the products of volume current densities and
winding depth, which one would expect to increase with machine size. Thus machine torque
(and power) densities tend to increase somewhat faster with size.
2. The current distributions want to align with each other. In actual practice what is done is to
generate a stator current distribution which is not static as implied here but which rotates in
space:
KS = K cos(pθ −ωt)
z S
and this pulls the rotor along.
3. For a given pair of current distributions there is a maximum torque that can be sustained,
but as long as the torque that is applied to the rotor is less than that value the rotor will
adjust to the correct angle.
3 Continuous Approximation to Winding Patterns:
Now let’s try to produce those surface current distributions with physical windings. In fact we
can’t do exactly that yet, but we can approximate a physical winding with a turns distribution
that would look like:
N
S
n = cospθ
S
2R
N
R
n = cosp (θ −φ)
R
2R
Note that this implies that N and N are the total number of turns on the rotor and stator.
S R
i.e.:
π
2
p n Rdθ = N
S S
−π
 2
Then the surface current densities are as we assumed above, with:
N I N I
S S R R
K = K =
S R
2R 2R
So far nothing is different, but with an assumed number of turns we can proceed to computing
inductances. It is important to remember what these assumed winding distributions mean: they
are the density of wires along the surface of the rotor and stator. A positive value implies a wire
with sense in the +z direction, a negative value implies a wire with sense in the -z direction. That
is, if terminal current for a winding is positive, current is in the +z direction if n is positive, in
the -z direction if n is negative. In fact, such a winding would be made of elementary coils with
one half (the negatively going half) separated from the other half (the positively going half) by a
physical angle of π/p. So the flux linked by that elemental coil would be:
θ
 
Φ i (θ) = µ 0 H r (θ ) Rdθ
θ−π/p
 
So, if only the stator winding is excited, radial magnetic field is:
N I
S S
H = − sinpθ
r
2gp
and thus the elementary coil flux is:
µ N I R
0 S S
Φ (θ) = cospθ
i p2g
Now, this is flux linked by an elementary coil. To get flux linked by a whole winding we must
‘add up’ the flux linkages of all of the elementary coils. In our continuous approximation to the
real coil this is the same as integrating over the coil distribution:
π
2p
λ = p Φ (θ)n (θ)Rdθ
S i S
− π
 2p
This evaluates fairly easily to:
π RN2
λ S = µ 0 4 gp2 S I s
which implies a self-inductance for the stator winding of:
π RN2
L S = µ 0 4 gp2 S
The same process can be used to find self-inductance of the rotor winding (with appropriate
changes of spatial variables), and the answer is:
π RN2
L R = µ 0 4 gp2 R
To find the mutual inductance between the two windings, excite one and compute flux linked
by the other. All of the expressions here can be used, and the answer is:
π RN N
S R
M(φ) = µ 0 4 gp2 cospφ
Now it is fairly easy to compute torque using conventional methods. Assuming both windings
are excited, magnetic coenergy is:
1 1
W = L I2 + L I2 + M(φ)I I
m S S R R S R
2 2
and then torque is:
 
∂W π RN N
T = m = −µ 0 S R I S I R sinpφ
∂φ 4 gp
and then substituting for N I and N I :
S S R R
N I = 2RK
S S S
N I = 2RK
R R R
we get the same answer for torque as with the field approach:
µ πR3 
T =2πR2 < τ >= 0 K K sinpφ
θ S R
pg
4 Classical, Lumped-Parameter Synchronous Machine:
Now we are in a position to examine the simplest model of a polyphase synchronous machine.
Suppose we have a machine in which the rotor is the same as the one we were considering, but the
stator has three separate windings, identical but with spatial orientation separated by an electrical
◦
angle of 120 = 2π/3. The three stator windings will have the same self- inductance (L ).
a
With a little bit of examination it can be seen that the three stator windings will have mutual
◦
inductance, and that inductance will be characterized by the cosine of 120 . Since the physical
angle between any pair of stator windings is the same,
1
L = L = L = − L
ab ac bc a
2
There will also be a mutual inductance between the rotor and each phase of the stator. Using
M to denote the magnitude of that inductance:
π RN N
a f
M = µ 0 4 gp2
M = M cos(pφ)
af
2π
M = M cos pφ −
bf
3
 
2π
M = M cos pφ +
cf
3
 
We show in Chapter 1 of these notes that torque for this system is:
2π 2π
T = −pMi i sin(pφ)−pMi i sin pφ − −pMi i sin pφ +
a f b f c f
3 3
 
5 Balanced Operation:
Now, suppose the machine is operated in this fashion: the rotor turns at a constant velocity, the
field current is held constant, and the three stator currents are sinusoids in time, with the same
amplitude and with phases that differ by 120 degrees.
pφ = ωt + δ
i
i = I
f f
i = I cos(ωt)
a
2π
i = I cos ωt −
b
3
 
2π
i = I cos ωt +
c
3
 
Straightforward (but tedious) manipulation yields an expression for torque:
3
T = − pMII sinδ
f i
2
Operated in this way, with balanced currents and with the mechanical speed consistent with
the electrical frequency (pΩ = ω), the machine exhibits a constant torque. The phase angle δ is
i
called the torque angle, but it is important to use some caution, as there is more than one torque
angle.
Now, look at the machine from the electrical terminals. Flux linked by Phase A will be:
λ = L i + L i + L i + MI cospφ
a a a ab b ac c f
Noting that the sum of phase currents is, under balanced conditions, zero and that the mutual
phase-phase inductances are equal, this simplifies to:
λ = (L −L )i + MI cospφ = L i + MI cospφ
a a ab a f d a f
where we use the notation L to denote synchronous inductance.
d
Now, if the machine is turning at a speed consistent with the electrical frequency we say it is
operating synchronously, and it is possible to employ complex notation in the sinusoidal steady
state. Then, note:
i = I cos(ωt + θ ) = Re Iejωt+θi
a i
 
If , we can write an expression for the complex amplitude of flux as:
λ = Re Λ ejωt
a a
 
where we have used this complex notation:
I = Iejθi
I = I ejθm
f f
Now, if we look for terminal voltage of this system, it is:
dλ
v = a = Re jωΛ ejωt
a dt a
 
This system is described by the equivalent circuit shown in Figure 2.
j X
d
+
+
E V
af
−
−
Figure 2: Round Rotor Synchronous Machine Equivalent Circuit
where the internal voltage is:
E = jωMI ejθm
af f
Now, if that is connected to a voltage source (i.e. if is fixed), terminal current is:
V −E ejδ
af
I =
jX
d
where X = ωL is the synchronous reactance.
d d
Then real and reactive power (in phase A) are:
1
∗
P + jQ = VI
2
∗
1 V −E ejδ
af
= V
2 jX d 
1 |V |2 1VE ejδ
af
= −
2−jX 2 −jX
d d
This makes real and reactive power:
1VE
af
P = − sinδ
a
2 X
d
1V 2 1VE X
af d
Q = − δ
a
2X 2 cos
d
If we consider all three phases, real power is
3VE
af
P = − sinδ
2 X
d
Now, at last we need to look at actual operation of these machines, which can serve either as
motors or as generators.
Vector diagrams that describe operation as a motor and as a generator are shown in Figures 3
and 4, respectively.
I
a V V
δ
I
δ a
j X I
d a
j X I
d a
E
E af
af
Over−Excited Under−Excited
Figure 3: Motor Operation, Under- and Over- Excited
Operation as a generator is not much different from operation as a motor, but it is common to
make notations with the terminal current given the opposite (“generator”) sign.
E
af
E
af
j X I
d a
j X I
d a
δ
δ I a
V
V
I
a
Over−Excited Under−Excited
Figure 4: Generator Operation, Under- and Over- Excited
6 Reconciliation of Models
We have determined that we can predict its power and/or torque characteristics from two points
of view : first, by knowing currents in the rotor and stator we could derive an expression for torque
vs. a power angle:
3
T = − pMII sinδ
f i
2
From a circuit point of view, it is possible to derive an expression for power:
3VE
af
P = − sinδ
2 X
d
and of course since power is torque times speed, this implies that:
3VE 3pV E
af af
T = − sinδ = − sinδ
2 ΩX 2 ωX
d d
In this section of the notes we will, first of all, reconcile these notions, look a bit more at what
they mean, and then generalize our simple theory to salient pole machines as an introduction to
two-axis theory of electric machines.
6.1 Torque Angles:
Figure 5 shows a vector diagram that shows operation of a synchronous motor. It represents the
MMF’s and fluxes from the rotor and stator in their respective positions in space during normal
operation. Terminalfluxischosentobe‘real’,oroccupythehorizontalposition. Inmotoroperation
the rotor lags by angle δ, so the rotor flux MI is shown in that position. Stator current is also
f
shown, and the torque angle between it and the rotor, δ is also shown. Now, note that the dotted
i
line OA, drawn perpendicular to a line drawn between the stator flux L I and terminal flux Λ ,
d t
has length:
|OA|= L I sinδ = Λ sinδ
d i t
L I
d
A
i
t
O
M I
f
Figure 5: Synchronous Machine Phasor Addition
Then, noting that terminal voltage V = ωΛ , E = ωMI and X = ωL , straightforward
t a f d d
substitution yields:
3pV E 3
af
sinδ = pMII sinδ
f i
2 ωX 2
d
So the current- and voltage- based pictures do give the same result for torque.
7 Per-Unit Systems:
Before going on, we should take a short detour to look into per-unit systems, a notational device
that, in addition to being convenient, will sometimes be conceptually helpful. The basic notion is
quite simple: for most variables we will note a base quantity and then, by dividing the variable by
the basewe havea per-unit versionof that variable. Generally we will want to tiethe basequantity
to some aspect of normal operation. So, for example, we might make the base voltage and current
correspond with machine rating. If that is the case, then power base becomes:
P =3V I
B B B
and we can define, in similar fashion, an impedance base:
V
B
Z =
B
I
B
Now, a little caution is required here. We have defined voltage base as line-neutral and current
base as line current (both RMS). That is not necessary. In a three phase system we could very well
have defined base voltage to have been line-line and base current to be current in a delta connected
element:
√ I
B
V BΔ = 3V B I BΔ = √
3
In that case the base power would be unchanged but base impedance would differ by a factor of
three:
P B = V BΔ I BΔ Z BΔ = 3Z B
However, if we were consistent with actual impedances (note that a delta connection of elements of
impedance 3Z is equivalent to a wye connection of Z), the per-unit impedances of a given system
are not dependent on the particular connection. In fact one of the major advantages of using a
per-unit system is that per-unit values are uniquely determined, while ordinary variables can be
line-line, line-neutral, RMS, peak, etc., for a large number of variations.
Perhaps unfortunate is the fact that base quantities are usually given as line-line voltage and
base power. So that:
2
V
1V
V
P
BΔ =
B =
B Z =
Δ
B
I = √
B B
3V BΔ I B 3 I BΔ P B
Now, we will usually write per-unit variables as lower-case versions of the ordinary variables:
V P
v = p = etc.
V P
B B
Thus, writteninper-unit notation,real and reactivepowerforasynchronousmachineoperating
in steady state are:
ve v2 ve
af af
p = − sinδ q = − sinδ
x x x
d d d
These are, of course, in motor reference coordinates, and represent real and reactive power into
the terminals of the machine.
8 Normal Operation:
The synchronous machine is used, essentially interchangeably, as a motor and as a generator. Note
that, as a motor, this type of machine produces torque only when it is running at synchronous
speed. This is not, of course, a problem for a turbogenerator which is started by its prime mover
(e.g. a steam turbine). Many synchronous motors are started as induction machines on their
damper cages (sometimes called starting cages). And of course with power electronic drives the
machine can often be considered to be “in synchronism” even down to zero speed.
As either a motor or as a generator, the synchronous machine can either produce or consume
reactive power. In normal operation real power is dictated by the load (if a motor) or the prime
mover (if a generator), and reactive power is determined by the real power and by field current.
Figure 6 shows one way of representing the capability of a synchronous machine. This picture
representsoperationasagenerator,sothesignsof p and q arereversed,but all of theotherelements
of operation are as we ordinarily would expect. If we plot p and q (calculated in the normal way)
against each other, we see the construction at the right. If we start at a location q = −v2/x , (and
d
remember that normally v = 1 per-unit , then the locus of p and q is what would be obtained by
swinging a vector of length ve /x over an angle δ. This is called a capability chart because it is
af d
an easy way of visualizing what the synchronous machine (in this case generator) can do. There
are three easily noted limits to capability. The upper limit is a circle (the one traced out by that
vector) which is referred to as field capability. The second limit is a circle that describes constant
|p +jq|. This is, of course, related to the magnitude of armature current and so this limit is called
armature capability. The final limit is related to machine stability, since the torque angle cannot
go beyond 90 degrees. In actuality there are often other limits that can be represented on this type
of a chart. For example, large synchronous generators typically have a problem with heating of the
Q
Field Limit
Stator
Limit
P
1
X Stability Limit
d
Figure 6: Synchronous Generator Capability Diagram
stator iron when they attempt to operate in highly underexcited conditions (q strongly negative),
so that one will often see another limit that prevents the operation of the machine near its stability
limit. In very large machines with more than one cooling state (e.g. different values of cooling
hydrogen pressure) there may be multiple curves for some or all of the limits.
Another way of describing the limitations of a synchronous machine is embodied in the Vee
Curve. An example is shown in Figure 7 . This is a cross-plot of magnitude of armature current
with field current. Note that the field and armature current limits are straightforward (and are the
right-hand and upper boundaries, respectively, of the chart). The machine stability limit is what
terminates each of the curves at the upper left-hand edge. Note that each curve has a minimum at
unity power factor. In fact, there is yet another cross-plot possible, called a compounding curve, in
which field current is plotted against real power for fixed power factor.
9 Salient Pole Machines: Two-Reaction Theory
So far, we have been describing what are referred to as “round rotor” machines, in which stator
reactance is not dependent on rotor position. This is a pretty good approximation for large turbine
generators and many smaller two-pole machines, but it is not a good approximation for many
synchronous motors nor for slower speed generators. For many such applications it is more cost
effective to wind the field conductors around steel bodies (called poles) which are then fastened
onto the rotor body, with bolts or dovetail joints. These produce magnetic anisotropies into the
machine which affect its operation. The theory which follows is an introduction to two-reaction
theory and consequently for the rotating field transformations that form the basis for most modern
dynamic analyses.
Figure 8 shows a very schematic picture of the salient pole machine, intended primarily to show
how to frame this analysis. As with the round rotor machine the stator winding is located in slots
in the surface of a highly permeable stator core annulus. The field winding is wound around steel
pole pieces. We separate the stator current sheet into two components: one aligned with and one
Vee Curves
1.2
1
0.8
aI
tinU-reP
0.6
0.4
0.2
0
0 0.5 1 1.5 2 2.5 3
Per-Unit Field Current
Per-Unit Real Power: 0.00 0.32 0.64 0.96
Figure 7: Synchronous Machine Vee Curve
in quadrature to the field. Remember that these two current components are themselves (linear)
combinations of the stator phase currents. The transformation between phase currents and the d-
and q- axis components is straightforward and will appear in Chapter 4 of these notes.
The key here is to separate MMF and flux into two orthogonal components and to pretend that
each can be treated as sinusoidal. The two components are aligned with the direct axis and with
the quadrature axis of the machine. The direct axis is aligned with the field winding, while the
quadrature axis leads the direct by 90 degrees. Then, if φ is the angle between the direct axis and
the axis of phase a, we can write for flux linking phase a:
λ = λ cosφ −λ sinφ
a d q
Then, in steady state operation, if V = dλa and φ = ωt + delta ,
a dt
V = −ωλ sinφ −ωλ cosφ
a d q
which allows us to define:
V = −ωλ
d q
V = ωλ
q d
one might think of the ‘voltage’ vector as leading the ‘flux’ vector by 90 degrees.
Now, if the machine is linear, those fluxes are given by:
λ = L I + MI
d d d f
λ = L I
q q q
d−axis
Iq
q=axis I
d
I
f
Figure 8: Cartoon of a Salient Pole Synchronous Machine
V
V
q
V
d
Figure 9: Resolution of Terminal Voltage
Note that, in general, L = L . In wound-field synchronous machines, usually L > L . The
d q d q
reverse is true for most salient (buried magnet) permanent magnet machines.
Referring to Figure 9, one can resolve terminal voltage into these components:
V = V sinδ
d
V = V cosδ
q
or:
V = −ωλ = −ωL I = V sinδ
d q q q
V = ωλ = ωL I + ωMI = V cosδ
q d d d f
which is easily inverted to produce:
V cosδ −E
af
I =
d
X
d
V sinδ
I = −
q
X
q
where
X = ωL X = ωL E = ωMI
d d q q af f
Now, we are working in ordinary variables (this discussion should help motivate the use of per­
unit!), and each of these variables is peak amplitude. Then, if we take up a complex frame of
reference:
V = V + jV
d q
I = I + jI
d q
complex power is:
3 3
∗
P + jQ = VI = {(V I + V I )+j (V I −V I )}
d d q q q d d q
2 2
or:
3 V E V 2 1 1
af
P = − sinδ + − sin2δ
2 X d 2 X d X q 
3 V 2 1 1 V 2 1 1 V E
af
Q = + − − cos2δ − cosδ
2 2 X d X q 2 X d X q X d 
I
d
I
I j X I
q d d
j X I
q
d axis
j Xq Iq
q axis
E
af
Figure 10: Phasor Diagram: Salient Pole Machine
A phasor diagram for a salient pole machine is shown in Figure 10. This is a little different
from the equivalent picture for a round-rotor machine, in that stator current has been separated
into its d- and q- axis components, and the voltage drops associated with those components have
been drawn separately. It is interesting and helpful to recognize that the internal voltage E can
af
be expressed as:
E af = E 1 +(X d −X q )I d
where the voltage E 1 is on the quadrature axis. In fact, E 1 would be the internal voltage of a
round rotor machine with reactance X and the same stator current and terminal voltage. Then
q
the operating point is found fairly easily:
X I sinψ
−1 q
δ = −tan
 V + X q I cosψ 
2 2
E 1 = (V + X q I sinψ) +(X q I cosψ)
 
Power-Angle Curves

| 1.5 |
| --- |

| | 1.510.50 | |
| --- | --- | --- |
| - | 4 | 0 1 2 3 |

xd=2.2
xq = 1.6
tinU-reP
Round Rotor
Salient Rotor
-
-1.5
Torque Angle
Figure 11: Torque-Angle Curves: Round Rotor and Salient Pole Machines
Acomparisonof torque-anglecurvesfora pairof machines, onewith around, onewith a salient
rotor is shown in Figure 11 . It is not too difficult to see why power systems analysts often neglect
saliency in doing things like transient stability calculations.
10 Relating Rating to Size
It is possible, even with the simple model we have developed so far, to establish a quantitative
relationship between machine size and rating, depending (of course) on elements such as useful flux
and surface current density. To start, note that the rating of a machine (motor or generator) is:
|P + jQ| = qV I
where q is the number of phases, V is the RMS voltage in each phase and I is the RMS current.
To establish machine rating we must establish voltage and current, and we do these separately.
10.1 Voltage
Assume that our sinusoidal approximation for turns density is valid:
N
a
n (θ) = cospθ
a
2R
And suppose that working flux density is:
B r (θ) = B 0 sinp(θ −φ)
Now, to compute flux linked by the winding (and consequently to compute voltage), we first
compute flux linked by an incremental coil:
θ
 
λ (θ) = B (θ )Rdθ
i r
θ−π
 p
Then flux linked by the whole coil is:
π
2p π 2 RN a
λ a = p λ i (θ)n a (θ)Rdθ = B 0 cospφ
−π 4 p
 2p
This is instantaneous flux linked when the rotor is at angle φ. If the machine is operating at some
electrical frequency ω with a phase angle so that pφ = ωt + δ, the RMS magnitude of terminal
voltage is:
ωπ B
0
V = 2 RN √
a a
p 4 2
Finally, note that the useful peak current density that can be used is limited by the fraction of
machine periphery used for slots:
B 0 = B s (1−λ s )
where B is the flux density in the teeth, limited by saturation of the magnetic material.
s
10.2 Current
The (RMS) magnitude of the current sheet produced by a current of (RMS) magnitude I is:
qN I
a
K =
z
2 2R
And then the current is, in terms of the current sheet magnitude:
2
I = 2RK
z
qN
a
Note that the surface current density is, in terms of area current density J , slot space factor λ
s s
and slot depth h :
s
K = λ J h
z s s s
This gives terminal current in terms of dimensions and useful current density:
4R
I = λ h J
s s s
qN
a
10.3 Rating
Assembling these expressions, machine rating becomes:
ω B
|P + jQ| = qV I = 2πR2 √ s λ (1−λ )h J
s s s s
p 2
This expression is actually fairly easily interpreted. The product of slot factor times one minus
slot factor optimizes rather quickly to 1/4 (when λ = 1). We could interpret this as:
s
∗
|P = jQ| = A u τ
s s
where the interaction area is:
A = 2πR 
s
The surface velocity of interaction is:
ω
u = R = ΩR
s
p
and the fragment of expression which “looks like” traction is:
B
∗ s
τ = h J √ λ (1−λ )
s s s s
2
Note that this is not quite traction since the current and magnetic flux may not be ideally aligned,
and this is why the expression incorporates reactive as well as real power.
This is not quite yet the whole story. The limit on B is easily understood to be caused by
s
saturation of magnetic material. The other important element on shear stress density, h J is a
s s
little more involved.
We will do a more complete derivationof winding reactances shortly. Here, start by noting that
the per-unit, or normalized synchronous reactance is:
I µ R λ √ h J
0 s s s
x = X = 2
d d
V pg 1−λ B
s s
While this may be somewhat interesting by itself, it becomes useful if we solve it for h J :
s a
p(1−λ )B
s s
h J = x g √
s a d
µ 0 Rλ s 2
That is, if x is fixed, h J (and so power) are directly related to air- gap g.Now, to get a limit on
d s a
g, we must answer the question of how far the field winding can “throw” effective air- gap flux? To
understand this question, we must calculate the field current to produce rated voltage, no- load,
and then the excess of field current required to accommodate load current.
Under rated operation, per- unit field voltage is:
e2 = v 2 +(x i) 2 +2x i sinψ
af d d
Or, if at rated conditions v and i are both unity (one per- unit), then
e = 1+x2 +2x sinψ
af d d
 
Thus, given a value for x and ψ, per- unit internal voltage e is also fixed. Then field current
d af
required can be calculated by first estimating field winding current for “no-load operation”.
µ N I
0 f fnl
B =
r
2gp
and rated field current is:
I = I e
f fnl af
or, required rated field current is:
2gp(1−λ )B
p s
N I = e
f f af
µ
0
Next, I can be related to a field current density:
f
N
RS
N I = A J
f f RS f
2
where N is the number of rotor slots and the rotor slot area A is
RS RS
A = w h
RS R R
where h is rotor slot height and w is rotor slot width:
R R
2πR
w = λ
R R
N
RS
Then:
N I = πRλ h J
f f R R f
Now we have a value for air- gap g:
k
Rλ
h
J
2µ
0
R
R
f
f
g =
p(1−λ )B e
s s af
This then gives us useful armature surface current density:
√ x λ
d R
h J = 2 h J
s s R f
e λ
af s
We will not have a lot more to say about this. Note that the ratio of x /e can be quite small
d af
(if the per-unit reactance is small), will never be a very large number for any practical machine,
and is generally less than one. As a practical matter it is unusual for the per-unit synchronous
reatance of a machine to be larger than about 2 or 2.25 per-unit. What this tells us should be
obvious: either the rotor or the stator of a machine can produce the dominant limitation on shear
stress density (and so on rating). The best designs are “balanced”, with both limits being reached
at the same time.
11 Winding Inductance Calculation
The purpose of this section is to show how the inductances of windings in round- rotor machines
with narrow air gaps may be calculated. We deal only with the idealized air- gap magnetic fields,
and do not consider slot, end winding, peripheral or skew reactances. We do, however, consider
the space harmonics of winding magneto-motive force (MMF).
To start, consider the MMF of a full- pitch, concentrated winding. Assuming that the winding
has a total of N turns over p pole- pairs, the MMF is:
∞
4 NI
F = sinnpφ
nπ 2p
n = 1
nodd
This leads directly to magnetic flux density in the air- gap:
∞
µ 0 4 NI
B = sinnpφ
r
g nπ 2p
n = 1
nodd
Note that a real winding, which will most likely not be full- pitched and concentrated, will have a
winding factor which is the product of pitch and breadth factors, to be discussed later.
Now, suppose that there is a polyphase winding, consisting of more than one phase (we will use
three phases), driven with one of two types of current. The first of these is balanced, current:
I = I cos(ωt)
a
2π
I = I cos(ωt − )
b
3
2π
I = I cos(ωt + ) (1)
c
3
Conversely, we might consider Zero Sequence currents:
I = I = I = I cosωt
a b c
Then it is possible to express magnetic flux density for the two distinct cases. For the balanced
case:
∞
B = B sin(npφ ωt)
r rn
n=1
 
where
• The upper sign holds for n = 1, 7,...
• The lower sign holds for n = 5, 11,...
• all other terms are zero
and
3µ 0 4 NI
B =
rn
2 g nπ 2p
The zero- sequence case is simpler: it is nonzero only for the triplen harmonics:
∞
µ 0 4 NI 3
B = (sin(npφ −ωt)+sin(npφ + ωt))
r
g nπ 2p 2
n=3,9,...
 
Next, consider the flux from a winding on the rotor: that will have the same form as the flux
produced by a single armature winding, but will be referred to the rotor position:
∞
µ 0 4 NI 
B = sinnpφ
rf
g nπ 2p
n = 1
nodd
which is, substituting φ = φ − ωt ,
p
∞
µ 0 4 NI
B = sinn(pφ −ωt)
rf
g nπ 2p
n = 1
nodd
The next step here is to find the flux linked if we have some air- gap flux density of the form:
∞
B = B sin(npφ ±ωt)
r rn
n=1
 
Now, it is possible to calculate flux linked by a single- turn, full- pitched winding by:
π
p
φ = B Rldφ
r
0
 
and this is:
∞
B
rn
φ = 2Rl cos(ωt)
np
n=1
 
This allows us to compute self- and mutual- inductances, since winding flux is:
λ = Nφ
The end of this is a set of expressions for various inductances. It should be noted that, in the
real world, most windings are not full- pitched nor concentrated. Fortunately, these shortcomings
can be accommodated by the use of winding factors.
The simplest and perhaps best definition of a winding factor is the ratio of flux linked by an
actual winding to flux that would have been linked by a full- pitch, concentrated winding with the
same number of turns. That is:
λ
actual
k =
w
λ full−pitch
It is relatively easy to show, using reciprocity arguments, that the winding factors are also
the ratio of effective MMF produced by an actual winding to the MMF that would have been
produced by the same winding were it to be full- pitched and concentrated. The argument goes
as follows: mutual inductance between any pair of windings is reciprocal. That is, if the windings
are designated one and two, the mutual inductance is flux induced in winding one by current in
winding two, and it is also flux induced in winding two by current in winding one. Since each
winding has a winding factor that influences its linking flux, and since the mutual inductance must
be reciprocal, the same winding factor must influence the MMF produced by the winding.
The winding factors are often expressed for each space harmonic, although sometimes when a
winding factor is referred to without reference to a harmonic number, what is meant is the space
factor for the space fundamental.
Two winding factors are commonly specified for ordinary, regular windings. These are usually
called pitch and breadth factors, reflecting the fact that often windings are not full pitched, which
means that individual turns do not span a full π electrical radians and that the windings occupy a
rangeorbreadth of slotswithinaphasebelt. Thebreadthfactorsareratiosof fluxlinkedbyagiven
winding to the flux that would be linked by that winding were it full- pitched and concentrated.
These two winding factors are discussed in a little more detail below. What is interesting to note,
although we do not prove it here, is that the winding factor of any given winding is the product of
the pitch and breadth factors:
k = k k
w p b
With winding factors as defined here and in the sections below, it is possible to define winding
inductances. For example, the synchronous inductance of a winding will be the apparent induc­
tance of one phase when the polyphase winding is driven by a balanced set of currents. This is,
approximately:
L = ∞ 34 µ 0 N2Rlk w 2 n
d 2π p2gn2
n=1,5,7,...
 
This expression is approximate because it ignores the asynchronous interactions between higher
order harmonics and the rotor of the machine. These are beyond the scope of this note.
Zero- sequence inductance is the ratio of flux to current if a winding is excited by zero sequence
currents:
L 0 = ∞ 3 π 4 µ 0 N p2 2 g R n l 2 k w 2 n
n=3,9,...
 
And then mutual inductance, as between a field winding (f) and an armature winding (a), is:
∞
4 µ 0 N f N a k fn k an Rl
M(θ) = cos(npθ)
π p2gn2
n = 1
nodd
Now we turn out attention to computing the winding factors for simple, regular winding patterns.
We do not prove but only state that the winding factor can, for regular winding patterns, be
expressed as the product of a pitch factor and a breadth factor, each of which can be estimated
separately.
Pitchfactorisfoundbyconsideringthe fluxlinkedby aless-than-fullpitchedwinding. Consider
the situation in which radial magnetic flux density is:
B = B sin(npφ −ωt)
r n
A winding with pitch α will link flux:
π+α
2p 2p
λ = Nl B sin(npφ −ωt)Rdφ
n
π−α
 2p 2p
Pitch α refers to the angular displacement between sides of the coil, expressed in electrical
radians. For a full- pitch coil α = π.
The flux linked is:
2NlRB nπ nα
n
λ = sin( )sin( )
np 2 2
The pitch factor is seen to be:
nα
k = sin
pn
2
Now for breadth factor. This describes the fact that a winding may consist of a number of coils,
each linking flux slightly out of phase with the others. A regular winding will have a number (say
m) coil elements, separated by electrical angle γ.
Afull-pitchcoil with onesideat angle ξ will,inthepresenceof sinusoidal magnetic fluxdensity,
link flux:
π− ξ
p p
λ = Nl B sin(npφ −ωt)Rdφ
n
ξ
 p
This is readily evaluated to be:
2NlRB
ej(ωt−nξ)
n
λ =
Re
np
 
where complex number notation has been used for convenience in carrying out the rest of this
derivation.
Now: if the winding is distributed into m sets of slots and the slots are evenly spaced, the
angular position of each slot will be:
m −1
ξ = iγ − γ
i
2
and the number of turns in each slot will be N , so that actual flux linked will be:
mp
m−1
2NlRB 1
ej(ωt−nξi)
n
λ =
Re
np m
i=0
 
 
The breadth factor is then simply:
m−1
1
− 1γ)
−jn(iγ−m
k b =
e
2
m
i=0
 
Note that this can be written as:
− 1 m
ejnγm
2
−jniγ
k =
e
b
m
i=0
 
Now, focus on that sum. We know that any coverging geometric sum has a simple sum:
∞
1
xi =
1−x
i=0
 
and that a truncated sum is:
m−1 ∞ ∞
= −
i=0 i=0 i=m
 
Then the useful sum can be written as:
m−1 ∞ 1−ejnmγ
e −jniγ = 1−ejnmγ e −jniγ =
1−e−jnγ
i=0
i=0
 
 
Now, the breadth factor is found:
nmγ
sin
k = 2
bn m sin nγ
2
Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes Chapter 10
Analytic Design Evaluation of Induction Machines ∗
J.L. Kirtley Jr.
1 Introduction
Induction machines are perhaps the most widely used of all electric motors. They are generally
simpletobuild and rugged,offerreasonableasynchronousperformance: amanageabletorque-speed
curve, stable operationunder load, and generally satisfactory efficiency. Because they are so widely
used, they are worth understanding.
In addition to their current economic importance, induction motors and generators may find
application in some new applications with designs that are not similar to motors currently in
commerce. An example is very high speed motors for gas compressors, perhaps with squirrel cage
rotors, perhaps with solid iron (or perhaps with both).
Because it is possible that future, high performance induction machines will be required to
have characteristics different from those of existing machines, it is necessary to understand them
from first principles, and that is the objective of this document. It starts with a circuit theoretical
view of the induction machine. This analysis is strictly appropriate only for wound-rotor machines,
but leads to an understanding of more complex machines. This model will be used to explain the
basic operation of induction machines. Then we will derive a model for squirrel-cage machines.
Finally, we will show how models for solid rotor and mixed solid rotor/squirrel cage machines can
be constructed.
The view that we will take in this document is relentlessly classical. All of the elements that
we will use are calculated from first principles, and we do not resort to numerical analysis or
empirical methods unless we have no choice. While this may seem to be seriously limiting, it serves
our basic objective here, which is to achieve an understanding of how these machines work. It is
our feeling that once that understanding exists, it will be possible to employ more sophisticated
methods of analysis to get more accurate results for those elements of the machines which do not
lend themselves to simple analysis.
An elementary picture of the induction machine is shown in Figure 1. The rotor and stator are
coaxial. The stator has a polyphase winding in slots. The rotor has either a winding or a cage, also
∗ c2003 James L. Kirtley Jr.
in slots. This picture will be modified slightly when we get to talking of “solid rotor” machines,
anon. Generally, this analysis is carried out assuming three phases. As with many systems, this
generalizes to different numbers of phases with little difficulty.
Stator Core
Stator Winding
in Slots
Rotor Rotor Winding
or Cage in
Slots
Air−Gap
Figure 1: Axial View of an Induction Machine
2 Induction Motor Transformer Model
The induction machine has two electrically active elements: a rotor and a stator. In normal
operation,thestatorisexcitedby alternating voltage. (Weconsiderhereonlypolyphasemachines).
The stator excitation creates a magnetic field in the form of a rotating, or traveling wave, which
induces currents in the circuits of the rotor. Those currents, in turn, interact with the traveling
wave to produce torque. To start the analysis of this machine, assume that both the rotor and the
stator can be described by balanced, three – phase windings. The two sets are, of course, coupled
by mutual inductances which are dependent on rotor position. Stator fluxes are (λ ,λ ,λ ) and
a b c
rotor fluxes are (λ ,λ ,λ ). The flux vs. current relationship is given by:
A B C
λ i
a a
λ i
b
b
M
L
⎡
⎤
⎡
⎤
S
SR ⎤
⎡
i
λ
c
c
= (1)
⎢ λ ⎥ ⎢ i ⎥
⎢ ⎢ ⎢ λ B A ⎥ ⎥ ⎥ ⎢ ⎢ ⎢ MT S R L R ⎥ ⎥ ⎥ ⎢ ⎢ ⎢ i A B ⎥ ⎥ ⎥
⎢ ⎥ ⎢ ⎥⎢ ⎥
⎢ λ ⎥ ⎢ ⎥⎢ i ⎥
⎢ C ⎥ ⎣ ⎦⎢ C ⎥
⎣ ⎦ ⎣ ⎦
where the component matrices are:
L L L
a ab ab
L
L
L
L
=
(2)
a
ab
ab ⎤
⎡
S
L L L
ab ab a
⎢ ⎥
⎣ ⎦
L L L
A AB AB
L
L
L
L
=
(3)
AB
A
AB ⎤
⎡
R
L L L
AB AB A
⎢ ⎥
⎣ ⎦
The mutual inductance part of (1) is a circulant matrix:
M cos(pθ) M cos(pθ + 2π ) M cos(pθ − 2π)
3
3
M cos(pθ + 2
M = M cos(pθ − 2π) M cos(pθ)
π ) (4)
SR ⎡ 3 3 ⎤
M cos(pθ + 2π ) M cos(pθ − 2π) M cos(pθ)
3 3
⎢
⎥
⎣ ⎦
To carry the analysis further, it is necessary to make some assumptions regarding operation.
To start, assume balanced currents in both the stator and rotor:
i = I cos(ωt)
a S
i = I cos(ωt − 2π) (5)
b S 3
i = I cos(ωt + 2π)
c S 3
i = I cos(ω t + ξ )
A R R R
i = I cos(ω t + ξ − 2π) (6)
B R R R 3
i = I cos(ω t + ξ + 2π)
C R R R 3
The rotor position θ can be described by
θ = ω m t + θ 0 (7)
Under these assumptions, we may calculate the form of stator fluxes. As it turns out, we need
only write out the expressions for λ and λ to see what is going on:
a A
= (L
−L
)I
cos(ωt)+MI
(cos(ω
t + ξ
)cosp(ω
+ θ 0) (8)
λ
a
a
s
m
R
R
R
ab
2π 2π 2π 2π
t + θ 0)− )+cos(ω
t + ξ
− )cos(p(ω
t + θ 0)+ )
t + ξ
+ )cos(p(ω
+cos(ω
m
m
R
R
R
R
3 3 3 3
which, after reducing some of the trig expressions, becomes:
3
cos((pω
+ ω
)t + ξ
+ pθ 0) (9)
= (L
−L
)I
cos(ωt)+ MI
λ
m
a
a
s
R
R
R
ab
2
Doing the same thing for the rotor phase A yields:
2π 2π
λ
= MI
(cosp(ω
t + θ 0)cos(ωt))+cos(p(ω
t + θ 0)− )cos(ωt − ) (10)
s
m
m
A
3 3
2π 2π
t + θ 0)+ )cos(ωt + )+(L
−L
)I
cos(ω
t + ξ
+cos(p(ω
)
m
A
AB
R
R
R
3 3
This last expression is, after manipulating:
3
= MI
cos((ω −pω
)t −pθ 0)+(L
−L
)I
cos(ω
t + ξ
λ
) (11)
s
m
A
A
AB
R
R
R
2
These two expressions, 9 and 11 give expressions for fluxes in the armature and rotor windings
in terms of currents in the same two windings, assuming that both current distributions are sinu­
soidal in time and space and represent balanced distributions. The next step is to make another
assumption, that the stator and rotor frequencies match through rotor rotation. That is:
ω −pω = ω (12)
m R
It is important to keep straight the different frequencies here:
ω is stator electrical frequency
ω is rotor electrical frequency
R
ω is mechanical rotation speed
m
so that pω is electrical rotation speed.
m
To refer rotor quantities to the stator frame (i.e. non- rotating), and to work in complex
amplitudes, the following definitions are made:
λ = Re(Λ ejωt) (13)
a a
λ = Re(Λ ejωRt) (14)
A A
i = Re(I ejωt) (15)
a a
i = Re(I ejωRt) (16)
A A
With these definitions, the complex amplitudes embodied in 58 and 66 become:
3
Λ = L I + MI ej(ξR+pθ0) (17)
a S a A
2
3
Λ = MI e −jpθ0 + L I ejξR (18)
A a R A
2
Therearetwophaseanglesembeddedintheseexpressions: θ 0 whichdescribestherotorphysical
phase angle with respect to stator current and ξ which describes phase angle of rotor currents
R
with respect to stator currents. We hereby invent two new rotor variables:
Λ = Λ ejpθ) (19)
AR A
I = I ej(pθ0+ξR) (20)
AR A
These are rotor flux and current referred to armature phase angle. Note that Λ and I
AR AR
have the same phase relationship to each other as do Λ and I . Using 19 and 20 in 17 and 18,
A A
the basic flux/current relationship for the induction machine becomes:
Λ L 3M I
a = S 2 a (21)
Λ 3 M L I
 AR 2 R AR 
This is an equivalent single- phase statement, describing the flux/current relationship in phase
a, assuming balanced operation. The same expression will describe phases b and c.
Voltage at the terminals of the stator and rotor (possibly equivalent) windings is, then:
V = jωΛ + R I (22)
a a a a
V = jω Λ + R I (23)
AR R AR A AR
or:
3
V = jωL I + jω MI + R I (24)
a S a AR a a
2
3
V = jω MI + jω L I + R I (25)
AR R a R R AR A AR
2
To carry this further, it is necessary to go a little deeper into the machine’s parameters. Note
that L and L are synchronous inductances for the stator and rotor. These may be separated
S R
into space fundamental and “leakage” components as follows:
L = L −L = 34 µ 0 RlN S 2k S 2 + L (26)
S a ab 2π p2g Sl
L = L −L = 34 µ 0 RlN R 2 k R 2 + L (27)
R A AB 2π p2g Rl
Where the normal set of machine parameters holds:
R is rotor radius
l is active length
g is the effective air- gap
p is the number of pole- pairs
N represents number of turns
k represents the winding factor
S as a subscript refers to the stator
R as a subscript refers to the rotor
L is “leakage” inductance
l
The two leakageterms L and L containhigherorderharmonicstatorand rotorinductances,
Sl Rl
slot inducances, end- winding inductances and, if necessary, a provision for rotor skew. Essentially,
they are used to represent all flux in the rotor and stator that is not mutually coupled.
In the same terms, the stator- to- rotor mutual inductance, which is taken to comprise only a
space fundamental term, is:
4 µ 0 RlN S N R k S k R
M = (28)
π p2g
Note thatthereare, of course, spaceharmonicmutual flux linkages. If they weretobe included,
they would hair up the analysis substantially. We ignore them here and note that they do have an
effect on machine behavior, but that effect is second- order.
Air- gap permeance is defined as:
4 µ 0 Rl
℘ = (29)
ag π p2g
so that the inductances are:
3
L = ℘ k2 N2 + L (30)
S ag S S Sl
2
3
L = ℘ k2 N2 + L (31)
R 2 ag R R Rl
M = ℘ N N k k (32)
ag S R S R
Here we define “slip” s by:
ω = sω (33)
R
so that
pω
m
s =1− (34)
ω
Then the voltage balance equations become:
3 3
V = jω ℘ k2 N2 + L I + jω ℘ N N k k I + R I (35)
a 2 ag S S Sl a 2 ag S R S R AR a a
 
3 3
V = jsω ℘ N N k k I + jsω ℘ k2N2 + L I + R I (36)
AR 2 ag S R S R a 2 ag R R Rl AR A AR
 
At this point, we are ready to define rotor current referred to the stator. This is done by
assuming an effective turns ratio which, in turn, defines an equivalent stator current to produce
the same fundamental MMF as a given rotor current:
N k
R R
I = I (37)
2 N k AR
S S
Now, if we assume that the rotor of the machine is shorted so that V = 0 and do some
AR
manipulation we obtain:
= j(X
+ X 1)I
+jX
I
+ R
I
V
(38)
a
M
M
2
a
a
a
R
2
0 = jX
I
+ j(X
+ X 2)I
I
+
(39)
M
M
2
2
a
s
where the following definitions have been made:
3
X = ω℘ N2k2 (40)
M ag S S
2
X 1 = ωL Sl (41)
N k 2
S S
X 2 = ωL Rl (42)
N k
 R R 
N k 2
S S
R 2 = R A (43)
N k
 R R 
These expressions describe a simple equivalent circuit for the induction motorshow in Figure 2.
We will amplify on this equivalent circuit anon.
I a R a X 1 X 2 I 2
∧ ∧ ∧ ∩∩∩∩ ∩∩∩∩
∨ ∨
⊃ <
⊃ ⊃ ⊃X m < < > > R s 2
Figure 2: Equivalent Circuit
2.1 Effective Air-Gap: Carter’s Coefficient
In induction motors, where the air-gap is usually quite small, it is necessary to correct the air-gap
permeance for the effect of slot openings. These make the permeance of the air-gap slightly smaller
thancalculatedfromthephysicalgap, effectively making thegap abitbigger. Theratioof effective
to physical gap is:
t + s
g = g (44)
eff
t + s −gf(α)
where
s
f(α) = f = α tan(α)−logsecα (45)
2g
 
3 Operation: Energy Balance
Now we are ready to see how the induction machine actually works. Assume for the moment
that Figure 2 represents one phase of a polyphase system and that the machine is operated under
balancedconditionsandthat speedisconstant orvarying only slowly. “Balanced conditions”means
that each phase has the same terminal voltage magnitude and that the phase difference between
phases is a uniform. Under those conditions, we may analyze each phase separately (as if it were
a single phase system). Assume an RMS voltage magnitude of V across each phase.
t
The “gap impedance”, or the impedance looking to the right from the right-most terminal of
X 1 is:
R
2
Z g = jX m ||(jX 2 + ) (46)
s
A total, or terminal impedance is then
Z t = jX 1 + R a + Z g (47)
and terminal current is
V
t
I = (48)
t
Z
t
Rotor current is found by using a current divider:
jX
m
I 2 = I t jX 2 + R s 2 (49)
“Air-gap” power is then calculated (assuming a three-phase machine):
R
= 3|I 2| 2 2 (50)
P
ag
s
This is real (time-average) power crossing the air-gap of the machine. Positive slip implies rotor
speed less than synchronous and positive air-gap power (motor operation). Negative slip means
rotor speed is higher than synchronous, negative air-gap power (from the rotor to the stator) and
generator operation.
Now,notethatthisequivalentcircuit representsarealphysical structure,soit shouldbepossible
to calculate power dissipated in the physical rotor resistance, and that is:
P = P s (51)
s ag
(Note that, since both P and s will always have the same sign, dissipated power is positive.)
ag
The rest of this discussion is framed in terms of motor operation, but the conversion to generator
operation is simple. The difference between power crossing the air-gap and power dissipated in the
rotor resistance must be converted from mechanical form:
P = P −P (52)
m ag s
and electrical input power is:
P = P + P (53)
in ag a
where armature dissipation is:
P = 3|I | 2R (54)
a t a
Output (mechanical) power is
P out = P ag −P w (55)
Where P describes friction, windage and certain stray losses which we will discuss later.
w
And, finally, efficiency and power factor are:
P
out
η = (56)
P
in
P
in
cosψ = (57)
3V I
t t
% -----------------------------------------------------­
% Torque-Speed Curve for an Induction Motor
% Assumes the classical model
% This is a single-circuit model
% Required parameters are R1, X1, X2, R2, Xm, Vt, Ns
% Assumed is a three-phase motor
% This thing does a motoring, full speed range curve
% Copyright 1994 James L. Kirtley Jr.
% ------------------------------------------------------­
s = .002:.002:1; % vector of slip
N = Ns .* (1 - s); % Speed, in RPM
oms = 2*pi*Ns/60; % Synchronous speed
Rr = R2 ./ s; % Rotor resistance
Zr = j*X2 + Rr; % Total rotor impedance
Za = par(j*Xm, Zr); % Air-gap impedance
Zt = R1 + j*X1 +Za; % Terminal impedance
Ia = Vt ./ Zt; % Terminal Current
I2 = Ia .* cdiv (Zr, j*Xm); % Rotor Current
Pag = 3 .* abs(I2) .^2 .* Rr; % Air-Gap Power
Pm = Pag .* (1 - s); % Converted Power
Trq = Pag ./ oms; % Developed Torque
subplot(2,1,1)
plot(N, Trq)
title(’Induction Motor’);
ylabel(’N-m’);
subplot(2,1,2)
plot(N, Pm);
ylabel(’Watts’);
xlabel(’RPM’);
3.1 Example of Operation
The following MATLAB script generates a torque-speed and power-speed curve for the simple
induction motor model described above. Note that, while the analysis does not require that any
of the parameters, such as rotor resistance, be independent of rotor speed, this simple script does
assume that all parameters are constant.
3.2 Example
That MATLAB script has been run for a standard motor with parameters given in Table 1.
Torque vs. speed and power vs. speed are plotted for this motor in Figure 3. These curves were
generated by the MATLAB script shown above.
Table 1: Example, Standard Motor
Rating 300 kw
Voltage 440 VRMS, l-l
254 VRMS, l-n
Stator Resistance R1 .0073 Ω
Rotor Resistance R2 .0064 Ω
Stator Reactance X1 .06 Ω
Rotor Reactance X2 .06 Ω
Magnetizing Reactance Xm 2.5 Ω
Synchronous Speed Ns 1200 RPM
4 Squirrel Cage Machine Model
Now we derive a circuit model for the squirrel-cage motor using field analytical techniques. The
model consistsof twomajorparts. The first of theseisa descriptionof stator flux intermsof stator
and rotor currents. The second is a descriptionof rotor current in terms of air- gap flux. The result
of all of this is a set of expressions for the elements of the circuit model for the induction machine.
To start, assume that the rotor is symmetrical enough to carry a surface current, the funda­
mental of which is:
ej(sωt−pφ )
K = ı Re K
r z r
 
ej(ωt−pφ) 
= ı Re
K
(58)
z r
 
Note that in 58 we have made use of the simple transformation between rotor and stator
coordinates:
 
φ = φ −ω t (59)
m
and that
pω = ω −ω = ω(1−s) (60)
m r
Here, we have used the following symbols:
K is complex amplitude of rotor surface current
r
s is per- unit “slip”
ω is stator electrical frequency
ω is rotor electrical frequency
r
ω is rotational speed
m
The rotor current will produce an air- gap flux density of the form:
ej(ωt−pφ)
B = Re B
(61)
r r
 
where
R
B r = −jµ 0 pg K r (62)
Induction Motor
6000
4000
m-N
2000
0
0 200 400 600 800 1000 1200
x 105
8
6
sttaW
4
2
0
0 200 400 600 800 1000 1200
RPM
Figure 3: Torque and Power vs. Speed for Example Motor
Note that this describes only radial magnetic flux density produced by the space fundamental
of rotor current. Flux linked by the armature winding due to this flux density is:
0
λ = lN k B (φ)Rdφ (63)
AR S S r
−π
 p
This yields a complex amplitude for λ :
AR
λ = Re Λ ejωt (64)
AR AR
 
where
R2N
k
2lµ
0
S
S
Λ = K (65)
AR p2g r
Adding this to flux produced by the stator currents, we have an expression for total stator flux:
Λ = 3 4 µ 0 N S 2 Rlk S 2 +L I + 2lµ 0 R2N S k S K (66)
a 2 π p2g Sl a p2g r
Expression 66 motivates a definiton of an equivalent rotor current I 2 in terms of the space
fundamental of rotor surface current density:
π R
I = K (67)
2 3 N k z
S S
Then we have the simple expression for stator flux:
Λ = (L + L )I + L I (68)
a ad Sl a ad 2
where L is the fundamental space harmonic component of stator inductance:
ad
L = 34 µ 0 N S 2k S 2 Rl (69)
ad 2π p2g
The second part of this derivation is the equivalent of finding a relationship between rotor flux
and I 2. However, since this machine has no discrete windings, we must focus on the individual
rotor bars.
Assume that there are N slots in the rotor. Each of these slots is carrying some current. If
R
the machine is symmetrical and operating with balanced currents, we may write an expression for
current in the kth slot as:
i = Re I ejsωt (70)
k k
 
where
−j 2πp
I = Ie NR (71)
k
and I is the complex amplitude of current in slot number zero. Expression 71 shows a uniform
progression of rotor current phase about the rotor. All rotor slots carry the same current, but that
current is phase retarded (delayed)from slot to slot because of relative rotation of the current wave
at slip frequency.
The rotor current density can then be expressed as a sum of impulses:
NR − 1
j(ωrt−k 2
2πk
π
p )
1
 
N
δ(φ
K z = Re
Ie
−
) (72)
R
⎛ R N ⎞
k=0 R
 
⎝ ⎠
The unit impulse function δ() is our way of approximating the rotor current as a series of
impulsive currents around the rotor.
This rotor surface current may be expressed as a fourier series of traveling waves:
∞
ej(ωrt−npφ )
K = Re K
(73)
z n
 n=−∞ 
 
Note that in 73, we are allowing for negative values of the space harmonic index n to allow for
reverse- rotating waves. This is reallypart of an expansioninboth timeand space, although we are
considering only the time fundamental part. We may recover the nth space harmonic component
of 73 by employing the following formula:
1 2π
−j(ωrt−npφ)dφ
K =< K (φ,t)e
> (74)
n π 0 r
 
Here the brackets <> denote time average and are here beause of the two- dimensional nature
of the expansion. To carry out 74 on 72, first expand 72 into its complex conjugate parts:
NR − 1
∗
j(ωrt−k 2
−j(ωrt−k 2
I
I
2πk
π
p )
π
p )
1
 
N
N
K r =
e
e
δ(φ
+
−
) (75)
R
R
2 R R N
k=0 R
 
If 75 is used in 74, the second half of 75 results in a sum of terms which time average to zero.
The first half of the expression results in:
2πNR − 1
−j 2
I
2πk
π
pk
ejnpφδ(φ −
N
)dφ (76)
K =
e
R
n 2πR 0 k=0 N R
 
The impulse function turns the integral into an evaluation of the rest of the integrand at the
impulse. What remains is the sum:
NR − 1
j(n−1) 2πkp
I
K = e NR (77)
n 2πR
k=0
 
The sum in 77 is easily evaluated. It is:
NR − 1 e j 2πk N p( R n−1) = N R if (n −1) N P R = integer (78)
0 otherwise
 
k=0
 
The integer in 78 may be positive, negative or zero. As it turns out, only the first three of these
(zero, plus and minus one) are important, because these produce the largest magnetic fields and
therefore fluxes. These are:
p
(n −1) = −1 or n = − NR −p
N p
R
= 0 or n = 1
NR+p
= 1 or n =
(79)
p
Note that 79 appears to produce space harmonic orders that may be of non- integer order. This
is not really true: is is necessary that np be an integer, and 79 will always satisfy that condition.
So, the harmonic orders of interest to us are one and
N
R
n + = +1 (80)
p
N
R
n− = − −1 (81)
p
 
Each of the space harmonics of the squirrel- cage current will produce radial flux density. A
surface current of the form:
N R I ej(ωrt−npφ )
K = Re
(82)
n
2πR
 
produces radial magnetic flux density:
ej(ωrt−npφ )
B = Re B
(83)
rn rn
 
where
µ N I
0 R
B = −j (84)
rn 2πnpg
In turn, each of the components of radial flux density will produce a component of induced
voltage. To calculate that, we must invoke Faraday’s law:
∂B
 ×E = − (85)
∂t
The radial component of 85, assuming that the fields do not vary with z, is:
1 ∂ ∂B
r
E = − (86)
z
R ∂φ ∂t
Or, assuming an electric field component of the form:
ej(ωrt−npφ)
E = Re E
(87)
zn n
 
Using 84 and 87 in 86, we obtain an expression for electric field induced by components of air-
gap flux:
ω R
r
E = B (88)
n np n
µ N ω R
0 R r
E = −j I (89)
n 2πg(np)2
Now, the total voltage induced in a slot pushes current through the conductors in that slot. We
may express this by:
E 1 + E n− + E n+ = Z slot I (90)
Now: in 90, there are three components of air- gap field. E 1 is the space fundamental field,
produced by the space fundamental of rotor current as well as by the space fundamental of stator
current. The other two components on the left of 90 are produced only by rotor currents and
actually represent additional reactive impedance to the rotor. This is often called zigzag leakage
inductance. The parameter Z represents impedance of the slot itself: resistance and reactance
slot
associated with cross- slot magnetic fields. Then 90 can be re-written as:
µ 0 N R ω r R 1 1
E = Z I + j + I (91)
1 slot 2πg (n
p)2 (n−p)2
+
 
To finish this model, it is necessary to translate 91 back to the stator. See that 67 and 77 make
the link between I and I :
2
N
R
I = I (92)
2
6N k
S S
Then the electric field at the surface of the rotor is:
6N S k S 3 µ 0 N S k S R 1 1
E = Z + jω + I (93)
slot r π g
1
2
p)2 (n−p)2
(n
N
+
R
 
 
 
This must be translated into an equivalent stator voltage. To do so, we use 88 to translate 93
into a statement of radial magnetic field, then find the flux liked and hence stator voltage from
that. Magnetic flux density is:
pE
1
B =
r ω R
r
6N S k S p R slot 3 µ 0 N S k S p 1 1
= + jL + j + I (94)
slot
2
p)2 (n−p)2
π g
(n
N
R
ω
+
r
R
 
 
 
 
 
where the slot impedance has been expressed by its real and imaginary parts:
Z = R + jω L (95)
slot slot r slot
Flux linking the armature winding is:
0
ej(ωt−pφ)
λ = N k lR Re B
dφ (96)
ag S S r
− π
 2p 
Which becomes:
λ = Re Λ ejωt (97)
ag ag
 
where:
2N k lR
S S
Λ = j B (98)
ag p r
Then “air- gap” voltage is:
2ωN k lR
S S
V = jωΛ = − B
ag ag p r
= −I 12lN S 2k S 2 jωL + R 2 + jω 6 µ 0 RlN S 2k S 2 1 + 1 (99)
slot s
2
p)2 (n−p)2
π g
(n
N
+
 
 
R 
 
 
Expression 99 describes the relationship between the space fundamental air- gap voltage V
ag
and rotor current I . This expression fits the equivalent circuit of Figure 4 if the definitions made
2
below hold:
X 2 I 2
∩∩∩∩
<
> R2
<
> s
<
Figure 4: Rotor Equivalent Circuit
X 2 = ω 12l N N S 2 k S 2 L slot + ω π 6 µ 0 Rl g N S 2 k S 2 (N 1 + p)2 + (N 1 − p)2 (100)
R R R 
12lN2 k2
R 2 = S S R slot (101)
N
R
The first term in 100 expresses slot leakage inductance for the rotor. Similarly, 101 expresses
rotor resistance in terms of slot resistance. Note that L and R are both expressed per unit
slot slot
length. The second termin100 expressesthe “zigzag”leakageinductanceresultingfromharmonics
on the order of rotor slot pitch.
Next, see that armature flux is just equal to air- gap flux plus armature leakage inductance.
That is, 68 could be written as:
Λ = Λ + L I (102)
a ag al a
There are a number of components of stator slot leakage L , each representing flux paths that
al
do not directly involve the rotor. Each of the components adds to the leakage inductance. The
most prominent components of stator leakage are referred to as slot, belt, zigzag, end winding, and
skew. Each of these will be discussed in the following paragraphs.
Belt and zigzag leakage components are due to air- gap space harmonics. As it turns out, these
are relatively complicated to estimate, but we may get some notion from our first- order view of
the machine. The trouble with estimating these leakage components is that they are not really
independent of the rotor, even though we call them “leakage”. Belt harmonics are of order n = 5
and n = 7. If there were no rotor coupling, the belt harmonic leakage terms would be:
X ag5 = 3 2π 4 µ 0 N 52 S 2 p k 2g 5 2R l (103)
X ag7 = 3 2π 4 µ 0 N 72 S 2 p k 2g 7 2R l (104)
The belt harmonics link to the rotor, however, and actually appear to be in parallel with
components of rotor impedance appropriate to 5p and 7p pole- pair machines. At these harmonic
orders we can usually ignore rotor resistance so that rotor impedance is purely inductive. Those
components are:
X 2,5 = ω 12l N N S 2k 5 2 L slot + ω π 6 µ 0 Rl g N S 2k 5 2 (N + 1 5p)2 + (N − 1 5p)2 (105)
R R R 
X 2,7 = ω 12l N N S 2k 7 2 L slot + ω π 6 µ 0 Rl g N S 2k 7 2 (N + 1 7p)2 + (N − 1 7p)2 (106)
R R R 
In the simple model of the squirrel cage machine, because the rotor resistances are relatively
small and slip high, the effect of rotor resistance is usually ignored. Then the fifth and seventh
harmonic components of belt leakage are:
X 5 = X ag5 X 2,5 (107)
X 7 = X ag7 X 2,7 (108)
Stator zigzag leakage is from those harmonics of the orders pn = N ±p where N .
s slots slots
X = 34 µ 0 N S 2Rl k ns+ + k ns − (109)
z 2π g (N + p)2 (N −p)2
 slots slots 
Note that these harmonic orders do not tend to be shorted out by the rotor cage and so no
direct interaction with the cage is ordinarily accounted for.
In order to reduce saliency effects that occur because the rotor teeth will tend to try to align
with the stator teeth, induction motor designers always use a different number of slots in the rotor
and stator. There still may be some tendency to align, and this produces “cogging” torques which
in turn produce vibration and noise and, in severe cases, can retard or even prevent starting. To
reduce this tendency to “cog”, rotors are often built with a little “skew”, or twist of the slots from
one end to the other. Thus, when one tooth is aligned at one end of the machine, it is un-aligned
at the other end. A side effect of this is to reduce the stator and rotor coupling by just a little,
and this produces leakage reactance. This is fairly easy to estimate. Consider, for example, a
space-fundamental flux density B r = B 1 cospθ, linking a (possibly) skewed full-pitch current path:
l π +ς x
2 2p p l
λ = B 1 cospθRdθdx
−l −π +ς x
 2 2p p l
Here, the skew in the rotor is ς electrical radians from one end of the machine to the other.
Evaluation of this yields:
ς
2B
Rl sin
1
2
λ =
p ς
2
Now, the difference between what would have been linked by a non-skewed rotor and what is
linked by the skewed rotor is the skew leakage flux, now expressible as:
sin ς
X = X 1− 2
k ag ς
 2 
The final component of leakage reactance is due to the end windings. This is perhaps the most
difficultofthemachineparameterstoestimate,being essentiallythree-dimensionalinnature. There
are a number of ways of estimating this parameter, but for our purposes we will use a simplified
parameter from Alger[1]:
X = 14 qµ 0 RN a 2 (p −0.3)
e 4π2 2 p2
As with all such formulae, extreme care is required here, since we can give little guidance as to
when this expression is correct or even close. And we will admit that a more complete treatment
of this element of machine parameter construction would be an improvement.
4.1 Harmonic Order Rotor Resistance and Stray Load Losses
Itisimportanttorecognizethatthemachinerotor“sees”each of thestatorharmonicsinessentially
the same way, and it is quite straightforward to estimate rotor parameters for the harmonic orders,
as we have done just above. Now, particularly for the “belt” harmonic orders, there are rotor
currents flowing in response to stator mmf’s at fifth and seventh space harmonic order. The
resistances attributable to these harmonic orders are:
12lN2k2
R 2,5 = s 5 R slot,5 (110)
N
R
12lN2k2
R 2,7 = s 7 R slot,7 (111)
N
R
The higher-order slot harmonics will have relative frequencies (slips) that are:
n = 6k +1
s = 1 (1−s)n k an integer (112)
n n = 6k −1
 
The induction motor electromagnetic interaction can now be described by an augmented mag­
netic circuit as shown in Figure 17. Note that the terminal flux of the machine is the sum of all
of the harmonic fluxes, and each space harmonic is excited by the same current so the individual
harmonic components are in series.
Eachofthespaceharmonicswillhaveanelectromagneticinteractionsimilartothefundamental:
power transferred across the air-gap is:
R
2 2,n
P = 3I
em,n 2,n
s
n
Of course dissipation in each circuit is:
P d,n = 3I 2 2 , n R 2,n
leaving
R
P = 3I2 2,n (1−s )
n
m,n 2,n
s
n
Note that this equivalent circuit has provision for two sets of circuits which look like “cages”.
In fact one of these sets is for the solid rotor body if that exists. We will discuss that anon. There
is also a provision (r ) for loss in the stator core iron.
c
Power deposited in the rotor harmonic resistance elements is characterized as “stray load” loss
because it is not easily computed from the simple machine equivalent circuit.
4.2 Slot Models
Some of the more interesting things that can be done with induction motors have to do with the
shaping of rotorslotsto achieveparticularfrequency-dependent effects. We will considerhere three
cases, but there are many other possibilities.
First, suppose the rotor slots are representable as being rectangular, as shown in Figure 5, and
assume that the slot dimensions are such that diffusion effects are not important so that current in
the slot conductor is approximately uniform. In that case, the slot resistance and inductance per
unit length are:
1
R = (113)
slot
w h σ
s s
h
s
L slot = µ 0 (114)
3w
s
The slot resistance is obvious, the slot inductance may be estimated by recognizing that if the
current in the slot is uniform, magnetic field crossing the slot must be:
I x
H =
y
w h
s s
Then energy stored in the field in the slot is simply:
1 L I2 = w hs µ 0 Ix 2 dx = 1µ 0 h s I2
slot s
2 0 2 w s h s 6 w s
w d h d
h
s
w
s
Figure 5: Single Slot
4.3 Deep Slots
Now, suppose the slot is not small enough that diffusion effects can be ignored. The slot becomes
“deep”totheextentthatitsdepthislessthan(orevencomparableto)the skin depth forconduction
at slip frequency. Conduction in this case may be represented by using the Diffusion Equation:
∂H
 2H = µ 0 σ
∂t
In the steady state, and assuming that only cross-slot flux (in the y direction) is important, and
the only variation that is important is in the radial (x) direction:
∂2H
y
∂x2 = jω s µ 0 σH y
This is solved by solutions of the form:
±(1+j) x
H y = H±e
δ
where the skin depth is
2
δ =
 ω
µ
σ
0
s
Since H must vanish at the bottom of the slot, it must take the form:
y
sinh(1+ j)x
H y = H top sinh(1+ j)h δ s
δ
Since current is the curl of magnetic field,
∂H 1+j cosh(1+ j)hs
J z = σE z = ∂x y = H top δ sinh(1+ j)h δ s
δ
Then slot impedance, per unit length, is:
1 1+j h
s
Z = coth(1+ j)
slot
w σδ δ
s
Of course the impedance (purely reactive) due to the slot depression must be added to this. It
is possible to extract the real and imaginary parts of this impedance (the process is algebraically a
bit messy) to yield:
sinh2hs +sin2hs
1
R = δ δ
slot w
σδ cosh2hs −cos2hs
s
δ δ
h 1 1 sinh2hs −sin2hs
L slot = µ 0 w d
σδ cosh2h δ
s −cos2h δ
+ ω
w
s
s
s
d
δ
δ
4.4 Multiple Cages
The purpose of a “deep” slot is to improve starting performance of a motor. When the rotor is
stationary, the frequency seen by rotor conductors is relatively high, and current crowding due to
theskineffect makesrotorresistanceappeartobe high. Astherotoracceleratesthefrequency seen
from the rotor drops, lessening the skin effect and making more use of the rotor conductor. This,
then, gives the machine higher starting torque (requiring high resistance) without compromising
running efficiency.
This effect can be carried even further by making use of multiple cages, such as is shown in
Figure 6. Here there are two conductors in a fairly complex slot. Estimating the impedance of this
slot is done in stages to build up an equivalent circuit.
Assumeforthepurposesof thisderivationthat each sectionof themultiplecageissmall enough
that currents can be considered to be uniform in each conductor. Then the bottom section may be
represented as a resistance in series with an inductance:
1
R =
a
σw h
1 1
µ h
0 1
L =
a
3 w 1
The narrow slot section with no conductor between the top and bottom conductors will contribute
an inductive impedance:
h
s
L s = µ 0
w
s
The top conductor will have a resistance:
1
R =
b
σw h
2 2
w2
hd
h2
ws
h1
hs
w1
Figure 6: Double Slot
Now, in the equivalent circuit, current flowing in the lower conductor will produce a magnetic field
across this section, yielding a series inductance of
h
2
L b = µ 0
w
2
Byanalogy with thebottomconductor,currentinthetop conductor flowsthrough only onethird of
the inductance of the top section, leading to the equivalent circuit of Figure 7, once the inductance
of the slot depression is added on:
h
d
L t = µ 0
w
d
L t 3 1 L b 3 2 L b L s L a
∩∩∩∩ ∩∩∩∩ ∩∩∩∩ ∩∩∩∩ ∩∩∩∩
< <
< > > R b < > > R a
< <
Figure 7: Equivalent Circuit: Double Bar
Now,thisrotorbarcircuit fitsrightintotheframeworkoftheinductionmotorequivalent circuit,
shown for the double cage case in Figure 8, with
12lN2k2
R 2a = S S R a
N
R
12lN2k2
R 2b = S S R b
N
R
12lN2k2 2
X 2a = ω S S ( L b + L s + L a )
N 3
R
12lN2k2 1
X 2a = ω S S (L t + L b )
N 3
R
I a R a X 1 X 2b I 2 X 2a
∧∧∧ ∩∩∩∩ ∩∩∩∩ ∩∩∩∩
∨∨
⊃ < <
⊃ ⊃ ⊃X m < < > > R s 2 b < < > > R s 2 a
Figure 8: Equivalent Circuit: Double Cage Rotor
4.5 Rotor End Ring Effects
It is necessary to correct for “end ring” resistance in the rotor. To do this, we note that the
magnitude of surface current density in the rotor is related to the magnitude of individual bar
current by:
2πR
I = K (115)
z z
N
R
Current in the end ring is:
R
I = K (116)
R z
p
Then it is straightforward to calculate the ratio between power dissipatedin the end rings to power
dissipated in the conductor bars themselves, considering the ratio of current densities and volumes.
Assuming that the bars and end rings have the same radial extent, the ratio of current densities is:
J N w
R R r
= (117)
J 2πp l
z r
where w is the average width of a conductor bar and l is the axial end ring length.
r r
Now, the ratio of losses (and hence the ratio of resistances) is found by multiplying the square
of current density ratio by the ratio of volumes. This is approximately:
R N w 2 2πR l N Rw
end R r r R r
= 2 = (118)
R 2πp l N l w πll p2
slot r R r r
4.6 Windage
Bearing friction, windage loss and fan input power are often regarded as elements of a “black art”.
We approach them with some level of trepidation, for motor manufacturers seem to take a highly
empirical viewof theseelements. Whatfollowsisanattempttobuild reasonablebut simplemodels
for two effects: loss in the air gap due to windage and input power to the fan for cooling. Some
caution is required here, for these elements of calculation have not been properly tested, although
they seem to give reasonable numbers
The first element is gap windage loss. This is produced by shearing of the air in the relative
rotation gap. It is likely to be a signifigant element only in machines with very narrow air gaps or
very high surface speeds. But these include, of course, the high performance machines with which
we are most interested. We approach this with a simple “couette flow” model. Air-gap shear loss
is approximately:
P = 2πR4 Ω 3lρ f (119)
w a
where ρ is the density of the air-gap medium (possibly air) and f is the friction factor, estimated
a
by:
.0076
f = (120)
1
R 4
n
and the Reynold’s Number R is
n
ΩRg
R = (121)
n
ν
air
and ν is the kinematic viscosity of the air-gap medium.
air
The second element is fan input power. We base an estimate of this on two hypotheses. The
first of these is that the mass flow of air circulated by the fan can be calculated by the loss in the
motorand an averagetemperatureriseinthecooling air. Thesecondhypothesisisthethepressure
rise of the fan is established by the centrifugal pressure rise associated with the surface speed at
the outside of the rotor. Taking these one at a time: If there is to be a temperature rise ΔT in the
cooling air, then the mass flow volume is:
P
d
m˙ =
C ΔT
p
and then volume flow is just
m˙
v˙ =
ρ
air
Pressure rise is estimated by centrifugal force:
ω 2
ΔP = ρ r
air fan
p
 
then power is given by:
P = ΔP v˙
fan
For reference, the properties of air are:
Density ρ 1.18 kg/m2
air
Kinematic Viscosity ν 1.56×10 −5 m2/sec
air
Heat Capacity C 1005.7 J/kg
p
4.7 Magnetic Circuit Loss and Excitation
There will be some loss in the stator magnetic circuit due to eddy current and hysteresis effects
in the core iron. In addition, particularly if the rotor and stator teeth are saturated there will be
MMF expended topush flux through thoseregions. Theseeffectsare verydifficulttoestimatefrom
first principles, so we resort to a simple model.
Assume that the loss in saturated steel follows a law such as:
ω f B b
e
P = P (122)
d B
ω B
 B B 
This is not too bad an estimate for the behavior of core iron. Typically, is a bit less than
f
two (between about 1.3 and 1.6) and is a bit more than two (between about 2.1 and 2.4). Of
b
course this model is good only for a fairly restricted range of flux density. Base dissipation is
usually expressed in “watts per kilogram”, so we first compute flux density and then mass of the
two principal components of the stator iron, the teeth and the back iron.
In a similar way we can model the exciting volt-amperes consumed by core iron by something
like:
B v1 B v2 ω
Q c = Va 1 + Va 2 (123)
B B ω
 B B B
This,too,isaformthat appearstobevalidforsomesteels. Quiteobviouslyitmaybenecessary
to develop different forms of curve ’fits’ for different materials.
Flux density (RMS) in the air-gap is:
pV
a
B = (124)
r
2RlN
k
ω
1
a
s
Then flux density in the stator teeth is:
w t + w 1
B = B (125)
t r
w
t
where w t is tooth width and w 1 is slot top width. Flux in the back-iron of the core is
R
B = B (126)
c r
pd
c
where d is the radial depth of the core.
c
One way of handling this loss is to assume that the core handles flux corresponding to terminal
voltage, add up the losses and then compute an equivalent resistance and reactance:
3|V |2
a
r =
c
Pcore
3|V |2
a
x =
c
Qcore
then put this equivalent resistance in parallel with the air-gap reactance element in the equivalent
circuit.
5 Solid Iron Rotor Bodies
Solidsteel rotorelectricmachines(SSRM) canbemadetooperatewith veryhigh surfacespeedsand
are thus suitable for use in high RPM situations. They resemble, in form and function, hysteresis
machines. However, asynchronous operation will produce higher power output because it takes
advantage of higher flux density. We consider here the interactions to be expected from solid iron
rotor bodies. The equivalent circuits can be placed in parallel (harmonic-by-harmonic) with the
equivalent circuits for the squirrel cage, if there is also a cage in the machine.
To estimate the rotor parameters R 2s and X 2s , we assume that important field quantities in
the machine are sinusoidally distributed in time and space, so that radial flux density is:
ej(ωt−pφ)
B = Re B
(127)
r r
 
and, similarly, axially directed rotor surface current is:
ej(ωt−pφ)
K = Re K
(128)
z z
 
Now, since by Faraday’s law:
∂B
 ×E = − (129)
∂t
we have, in this machine geometry:
1 ∂ ∂B
r
E = − (130)
z
R ∂φ ∂t
The transformation between rotor and stator coordinates is:
 
φ = φ −ω t (131)
m
where ω is rotor speed. Then:
m
pω = ω −ω = ω(1−s) (132)
m r
and
Now, axial electric field is, in the frame of the rotor, just:
ej(ωt−pφ)
E = Re E
(133)
z z
 
ej(ωrt−pφ )
= Re
E
(134)
z
 
and
ω R
r
E = B (135)
z p r
Of course electric field in the rotor frame is related to rotor surface current by:
E = Z K (136)
z s z
Now these quantities can be related to the stator by noting that air-gap voltage is related to
radial flux density by:
p
B = V (137)
r 2lN
Rω ag
k
1
a
The stator-equivalent rotor current is:
π R
I = K (138)
2 3 N k z
a a
Then we can find stator referred, rotor equivalent impedance to be:
V 3 4 l ω E
Z = ag = N2k2 z (139)
2 I 2πR a aω K
2 r z
Now, if rotor surface impedance can be expressed as:
Z = R + jω L (140)
s s r s
then
R
2
Z 2 =
+ jX 2 (141)
s
where
3 4 l
R 2 = 2πR N a 2 k 1 2R s (142)
3 4 l
X 2 = 2πR N a 2 k 1 2X s (143)
Now, to find the rotor surface impedance, we make use of a nonlineareddy-current model proposed
by Agarwal. First we define an equivalent penetration depth (similar to a skin depth):
2H
m
δ = (144)
 ω
σB
0
r
where σ is rotor surface material volume conductivity, B 0, ”saturation flux density” is taken to be
75 % of actual saturation flux density and
3 N k
a a
H = |K | = |I | (145)
m z π R 2
Then rotor surface resistivity and surface reactance are:
16 1
R = (146)
s
3π σδ
X = .5R (147)
s s
NotethattherotorelementsX 2 and R 2 depend onrotorcurrent I 2, sotheproblemisnonlinear.
We find,however,thatasimpleiterativesolutioncanbeused. Firstwemakeaguessfor R 2 andfind
currents. Then we use those currents to calculate R 2 and solve again for current. This procedure
is repeated until convergence, and the problem seems to converge within just a few steps.
Aside from the necessity to iterate to find rotor elements, standard network techniques can be
used to find currents, power input to the motor and power output from the motor, torque, etc.
5.1 Solution
Not all of the equivalent circuit elements are known as we start the solution. To start, we assume
a value for R 2, possibly some fraction of X
, but the value chosen doesn not seem to matter
m
much. The rotor reactance X 2 is just a fraction of R 2. Then, we proceed to compute an “air-gap”
impedance, just the impedance looking into the parallel combination of magnetizing and rotor
branches:
R
2
Z g = jX m ||(jX 2 + ) (148)
s
(Note that, for a generator, slip s is negative).
A total impedance is then
Z t = jX 1 + R 1 + Z g (149)
and terminal current is
V
t
I = (150)
t
Z
t
Rotor current is just:
jX
m
I 2 = I t jX 2 + R s 2 (151)
Now it is necessary to iteratively correct rotor impedance. This is done by estimating flux
density at the surface of the rotor using (145), then getting a rotor surface impedance using (146)
and using that and (143 to estimate a new value for R 2. Then we start again with (148). The
process “drops through” this point when the new and old estimates for R 2 agree to some criterion.
5.2 Harmonic Losses in Solid Steel
If the rotor of the machine is constructed of solid steel, there will be eddy currents induced on the
rotor surface by the higher-order space harmonics of stator current. These will produce magnetic
fields and losses. This calculation assumes the rotor surface is linear and smooth and can be
characterized by a conductivity and relative permeability. In this discussion we include two space
harmonics (positive and negative going). In practice it may be necessary to carry four (or even
more) harmonics, including both ‘belt’ and ‘zigzag’ order harmonics.
Terminal current produces magnetic field in the air-gap for each of the space harmonic orders,
and each of these magnetic fields induces rotor currents of the same harmonic order.
The “magnetizing” reactances for the two harmonic orders, really the two components of the
zigzag leakage, are:
k2
p
X = X (152)
zp m N2k2
p 1
k2
X = X n (153)
zn m N2 k2
n 1
where N and N are the positive and negative going harmonic orders: For ‘belt’ harmonics
p n
these orders are 7 and 5. For ‘zigzag’ they are:
N + p
s
N = (154)
p
p
N −p
s
N = (155)
n
p
Now, therewillbeacurrentonthesurfaceof therotorat eachharmonicorder,andfollowing67,
the equivalent rotor element current is:
π R
I = K (156)
2p 3 N k p
a p
π R
I = K (157)
2n 3 N k n
a n
These currents flow in response to the magnetic field in the air-gap which in turn produces an
axial electric field. Viewed from the rotor this electric field is:
E = s ωRB (158)
p p p
E = s ωRB (159)
n n n
where the slip for each of the harmonic orders is:
s = 1−N (1−s) (160)
p p
s = 1+N (1−s) (161)
n p
and then the surface currents that flow in the surface of the rotor are:
E
p
K = (162)
p Z
sp
E
K = n (163)
n Z
sn
where Z and Z are the surface impedances at positive and negative harmonic slip frequencies,
sp sn
respectively. Assuming a linear surface, these are, approximately:
1+j
Z = (164)
s
σδ
where σ is material restivity and the skin depth is
2
δ = (165)
 ω
µσ
s
and ω is the frequency of the given harmonic from the rotor surface. We can postulate that the
s
appropriate value of µ to use is the same as that estimatedin the nonlinear calculationof the space
fundamental, but this requires empirical confirmation.
The voltage induced in the stator by each of these space harmonic magnetic fluxes is:
2N k lRω
a p
V = B (166)
p N p p
p
2N k lRω
a n
V = B (167)
n N p n
n
Then the equivalent circuit impedance of the rotor is just:
N2k2lZ
V 3 4
p a p sp
Z 2p = = (168)
I 2π N R s
p p p
V 34 N2k2 lZ
Z 2n = n = a n sn (169)
I 2π N R s
n n n
The equivalent rotor circuit elements are now:
N2k2l
1
34
a p
R 2p = (170)
2π N R σδ
p p
34 N2k2 l 1
R 2n = a n (171)
2π N R σδ
n n
1
X 2p = R 2p (172)
2
1
X 2n = R 2n (173)
2
5.3 Stray Losses
Sofarinthisdocument,wehaveoutlinedthemajorelementsoftorqueproductionand consequently
of machine performance. We have also discussed, in some cases, briefly, the major sources of loss
in induction machines. Using what has been outlined in this document will give a reasonable
impression of how an induction machine works. We have also discussed some of the stray load
losses: those which can be (relatively) easily accounted for in an equivalent circuit description of
the machine. But there are other losses which will occur and which are harder to estimate. We do
not claim to do a particularly accurate job of estimating these losses, and fortunately they do not
normally turn out to be very large. To be accounted for here are:
1. No-load losses in rotor teeth because of stator slot opening modulation of fundamental flux
density,
2. Load losses in the rotor teeth because of stator zigzag mmf, and
3. No-load losses in the solid rotor body (if it exists) due to stator slot opening modulation of
fundamental flux density.
Note that these losses have a somewhat different character from the other miscellaneous losses we
compute. They show up as drag on the rotor, so we subtract their power from the mechanical
output of the machine. The first and third of these are, of course, very closely related so we take
them first.
The stator slot openings ‘modulate’ the space fundamental magnetic flux density. We may
estimate a slot opening angle (relative to the slot pitch):
2πw N w N
d s d s
θ = =
D
2πr r
Then the amplitude of the magnetic field disturbance is:
2 θ
D
B H = B r1 sin
π 2
In fact, this flux disturbance is really in the form of two traveling waves, one going forward and one
backward with respect to the stator at a velocity of ω/N . Since operating slip is relatively small,
s
the two variations will have just about the same frequency as viewed from the rotor, so it seems
reasonable to lump them together. The frequency is:
N
s
ω = ω
H
p
Now, for laminated rotors this magnetic field modulation will affect the tips of rotor teeth. We
assume (perhaps arbitrarily) that the loss due to this magnetic field modulation can be estimated
from ordinary steel data (as we estimated core loss above) and that only the rotor teeth, not any of
the rotor body, are affected. The method to be used is straightforward and follows almost exactly
what was done for core loss, with modification only of the frequency and field amplitude.
For solid steel rotors the story is only a little different. The magnetic field will produce an axial
electric field:
ω
E = R B
z p H
and that, in turn, will drive a surface current
E
K = z
z Z
s
√
Now, what is important is the magnitude of the surface current, and since |Z | = 1+.52R ≈
s s
1.118R , we can simply use rotor resistance. The nonlinear surface penetration depth is:
s
2B
0
δ =
σ|K
 ω
|
H
z
A brief iterative substitution, re-calculating δ and then |K | quickly yields consistent values for δ
z
and R . Then the full-voltage dissipation is:
s
|K |2
P = 2πRl z
rs
σδ
and an equivalent resistance is:
3|V |2
a
R =
rs
P
rs
Finally, the zigzag order current harmonics in the stator will produce magnetic fields in the
air gap which will drive magnetic losses in the teeth of the rotor. Note that this is a bit different
from the modulation of the space fundamental produced by the stator slot openings (although the
harmonic order will be the same, the spatial orientation will be different and will vary with load
current). The magnetic flux in the air-gap is most easily related to the equivalent circuit voltage
on the nth harmonic:
npv
n
B =
n
2lRN k omega
a n
This magnetic field variation will be substantial only for the zigzag order harmonics: the belt
harmonics will be essentially shorted out by the rotor cage and those losses calculated within
the equivalent circuit. The frequency seen by the rotor is that of the space harmonics, already
calculated, and the loss can be estimated in the same way as core loss, although as we have pointed
out it appears as a ‘drag’ on the rotor.
6 Induction Motor Speed Control
6.1 Introduction
The inherent attributes of induction machines make them very attractive for drive applications.
They are rugged, economical to build and have no sliding contacts to wear. The difficulty with
using induction machines in servomechanisms and variable speed drives is that they are “hard to
control”, since their torque-speed relationship is complex and nonlinear. With, however, modern
powerelectronicstoserveasfrequencychangersanddigital electronicstodotherequired arithmetic,
induction machines are seeing increasing use in drive applications.
In this chapter we develop models for control of induction motors. The derivation is quite brief
for it relies on what we have already done for synchronous machines. In this chapter, however, we
will stay in “ordinary” variables, skipping the per-unit normalization.
6.2 Volts/Hz Control
Remembering that induction machines generally tend to operate at relatively low per unit slip, we
might conclude that one way of building an adjustable speed drive would be to supply an induction
motor with adjustable stator frequency. And this is, indeed, possible. One thing to remember is
that flux is inversely proportional to frequency, so that to maintain constant flux one must make
stator voltage proportional to frequency (hence the name “constant volts/Hz”). However, voltage
supplies are always limited, so that at some frequency it is necessary to switch to constant voltage
control. The analogy to DC machines is fairly direct here: below some “base” speed, the machine
is controlled in constant flux (“volts/Hz”) mode, while above the base speed, flux is inversely
proportional to speed. It is easy to see that the maximum torque is then inversely to the square of
flux, or therefore to the square of frequency.
To get a first-order picture of how an induction machine works at adjustable speed, start with
the simplified equivalent network that describes the machine, as shown in Figure 9
Earlier in this chapter, it was shown that torque can be calculated by finding the power dissi­
pated in the virtual resistance R 2 /s and dividing by electrical speed. For a three phase machine,
and assuming we are dealing with RMS magnitudes:
p R
= 3 |I 2| 2 2
T
e
ω s
where ω is the electrical frequency and p is the number of pole pairs. It is straightforward to find
I 2 using network techniques. As an example, Figure 10 shows a series of torque/speed curves for
I a R a X 1 X 2 I 2
∧∧∧ ∩∩∩∩ ∩∩∩∩
∨∨
⊃ <
⊃ ⊃ ⊃X m < < > > R s 2
Figure 9: Equivalent Circuit
an induction machine operated with a wide range of input frequencies, both below and above its
“base” frequency. The parameters of this machine are:
Number of Phases 3
Number of Pole Pairs 3
RMS Terminal Voltage (line-line) 230
Frequency (Hz) 60
Stator Resistance R 1 .06 Ω
Rotor Resistance R 2 .055 Ω
Stator Leakage X 1 .34 Ω
Rotor Leakage X 2 .33 Ω
Magnetizing Reactance X 10.6 Ω
m
Strategyforoperatingthemachineistomaketerminalvoltagemagnitudeproportionaltofrequency
forinputfrequencieslessthanthe“BaseFrequency”,inthiscase60Hz,andtohold voltageconstant
for frequencies above the “Base Frequency”.
For high frequencies the torque production falls fairly rapidly with frequency (as it turns out,
it is roughly proportional to the inverse of the square of frequency). It also falls with very low
frequency because of the effects of terminal resistance. We will look at this next.
6.3 Idealized Model: No Stator Resistance
Ignore, for the moment, R 1. An equivalent circuit is shown in Figure 11. It is fairly easy to show
that, from the rotor, the combination of source, armature leakage and magnetizing branch can be
replaced by its equivalent circuit, as shown in in Figure 12.
In the circuit of Figure 12, the parameters are:
X
 m
V = V
X m + X 1
 
X = X m ||X 1
If the machine is operated at variable frequency ω, but the reactance is established at frequency
ω , current is:
B
 
V
I =
 + X 2)
+ R
ω
2
j(X
1
ω
s
B
Induction Motor Torque
250
200
150
m−N
100
50
0
0 50 100 150 200 250
Speed, RPM
Figure 10: Induction Machine Torque-Speed Curves
I a X 1 X 2 I 2
 
∩∩∩∩ ∩∩∩∩
− + V ⊃ ⊃ ⊃ ⊃ X m < < < > > R s 2
 
 
Figure 11: Idealized Circuit: Ignore Armature Resistance
and then torque is
 |
2
R s
2
V
|
p
= 3|I 2| 2 R
2 = 3
T
e
(X 1 +
(R s 2 )2
2
s
ω
X
)
+
2
Now, if we note that what counts is the absolute slip of the rotor, we might define a slip with
respect to base frequency:
ω ω ω ω
r r B B
s = = = s
B
ω ω ω ω
B
Then, if we assume that voltage is applied proportional to frequency:
ω
 
V = V
0
ω
B
and with a little manipulation, we get:
3p |V 0 |2 R sB 2
T =
e ω B (X 1 + X 2)2 +(R sB 2 )2
 
I a X 1 X 2 I 2
∩∩∩∩ ∩∩∩∩
 <
 + 
> R2
V
<
− > s
<
 
Figure 12: Idealized Equivalent
This would imply that torque is, if voltage is proportional to frequency, meaning constant applied
flux, dependent only on absolute slip. The torque-speed curve is a constant, dependent only on the
difference between synchronous and actual rotor speed.
This is fine, but eventually, the notion of “volts per Hz” runs out because at some number of
Hz, there are no more volts to be had. This is generally taken to be the “base” speed for the drive.
Above that speed, voltage is held constant, and torque is given by:
3p |V |2 R2
sB
T =
e ω B (X 1 + X 2)2 +(R sB 2 )2
Thepeakofthistorquehasasquare-inversedependenceonfrequency,ascanbeseenfromFigure13.
Induction Motor Torque
250
200
m−N
150
100
50
0
0 500 1000 1500 2000
Speed, RPM
Figure 13: Idealized Torque-Speed Curves: Zero Stator Resistance
6.4 Peak Torque Capability
Assuming we have a smart controller, we are interested in the actual capability of the machine. At
some voltage and frequency, torque is given by:
R 3 p |V | 2 R2
2 =
= 3|I 2| 2
ω
s
T
e
 + R
 + X 2)(
ω
))2 +
2 )2
s
(R
((X
1
1
s
ω
B
Now, we are interested in finding the peak value of that, which is given by the value of R 2 s which
maximizes power transfer to the virtual resistance. This is given by the matching condition:
R ω
2 = R
 2 +((X
 + X 2)(
))2
1
1
ω
s
 B
Then maximum (breakdown) torque is given by:
3
p | V | 2 R
 2 +((X
 + X 2)(
ω
))2
1
1
ω
ω
B
Tmax =
))2 +(R
 + R
 2 +((X
 + X 2)(
 + X 2)(
ω
ω
))2)2
((X
1
1
1
1
ω
ω
B
B
 
This is plotted in Figure 14. Just as a check, this was calculated assuming R 1 = 0, and the
resultsareplottedin figure15. Thisplot shows, asonewould expect, aconstanttorquelimit region
to zero speed.
Breakdown Torque
300
250
200
sreteM−notweN
150
100
50
0
0 20 40 60 80 100 120
Drive Frequency, Hz
Figure 14: Torque-Capability Curve For An Induction Motor
6.5 Field Oriented Control
One of the more useful impacts of modern power electronics and control technology has enabled
us to turn induction machines into high performance servomotors. In this note we will develop a
Breakdown Torque
300
250
sreteM−notweN
200
150
100
50
0 20 40 60 80 100 120
Drive Frequency, Hz
Figure 15: Idealized Torque Capability Curve: Zero Stator Resistance
picture of how this is done. Quite obviously there are many details which we will not touch here.
The objective is to emulate the performance of a DC machine, in which (as you will recall), torque
is a simple function of applied current. For a machine with one field winding, this is simply:
T = GI I
f a
This makes control of such a machine quite easy, for once the desired torque is known it is easy to
translate that torque command into a current and the motor does the rest.
Of course DC (commutator) machines are, at least in large sizes, expensive, not particularly
efficient, have relatively high maintenance requirements because of the sliding brush/commutator
interface, provide environmental problems because of sparking and carbon dust and are environ­
mentally sensitive. The induction motor is simpler and more rugged. Until fairly recently the
induction motor has not been widely used in servo applications because it was thought to be ”hard
to control”. As we will show, it does take a little effort and even some computation to do the
controls right, but this is becoming increasingly affordable.
6.6 Elementary Model:
We return to the elementary model of the induction motor. In ordinary variables, referred to the
stator, the machine is described by flux-current relationships (in the d-q reference frame):
λ L M i
dS S dS
=
λ M L i
 dR R dR 
λ L M i
qS S qS
=
λ M L i
 qR R qR 
Note the machine is symmetric (there is no saliency), and since we are referred to the stator,
the stator and rotor self-inductances include leakage terms:
L = M + L
S S 
L = M + L
R R 
The voltage equations are:
dλ
dS
v = −ωλ + r i
dS qS S dS
dt
dλ
qS
v = + ωλ + r i
qS dS S qS
dt
dλ
dR
0 = −ω λ + r i
s qR R dR
dt
dλ
qR
0 = + ω λ + r i
s dR R qR
dt
Note that both rotor and stator have “speed” voltage terms since they are both rotating with
respect to the rotating coordinate system. The speed of the rotating coordinate system is w with
respect to the stator. With respect to the rotor that speed is , where wm is the rotor mechanical
speed. Note that this analysis does not require that the reference frame coordinate system speed
w be constant.
Torque is given by:
3
T e = p (λ i −λ i )
dS qS qS dS
2
6.7 Simulation Model
As a first step in developing a simulation model, see that the inversion of the flux-current relation­
ship is (we use the d- axis since the q- axis is identical):
L M
R
i = λ − λ
dS L L −M2 dS L L −M2 dR
S R S R
M L
S
i = λ − λ
dR L L −M2 dS L L −M2 dR
S R S R
Now, if we make the following definitions (the motivation for this should by now be obvious):
X d = ω 0 L S
X kd = ω 0 L R
X ad = ω 0 M
M2
 
X d = ω 0 L S − L
 R 
the currents become:
ω X ω
0 ad 0
i = λ − λ
dS dS dR
X X X
d kd d
X ω X ω
ad 0 d 0
i = λ − λ
dR dS dR
X X X X
kd d d kd
The q- axis is the same.
Torque may be, with these calculations for current, written as:
3 3 ω 0 X ad
T = p (λ i −λ i ) = − p (λ λ −λ λ )
e dS qS qS dS dS qR qS dR
2 2 X X
kd d
Note that the usual problems with ordinary variables hold here: the foregoing expression was
written assuming the variables are expressed as peak quantities. If RMS is used we must replace
3/2 by 3!
With these, the simulation model is quite straightforward. The state equations are:
dλ
dS
= V +ωλ −R i
dS qS S dS
dt
dλ
qS
= V −ωλ −R i
qS dS S qS
dt
dλ
dR
= ω λ −R i
s qR R dR
dt
dλ
qR
= −ω λ −R i
s dR S qR
dt
dΩ 1
m
= (T + T )
e m
dt J
where the rotor frequency (slip frequency) is:
ω = ω −pΩ
s m
For simple simulations and constant excitaion frequency, the choice of coordinate systems is
arbitrary, so we can choose something convenient. For example, we might choose to fix the coordi­
nate system to a synchronously rotating frame, so that stator frequency ω = ω 0. In this case, we
could pick the stator voltage to lie on one axis or another. A common choice is V = 0 and V = V .
d q
6.8 Control Model
If we are going to turn the machine into a servomotor, we will want to be a bit more sophisticated
about our coordinate system. In general, the principle of field-oriented control is much like emu­
lating the function of a DC (commutator) machine. We figure out where the flux is, then inject
current to interact most directly with the flux.
As a first step, note that because the two stator flux linkages are the sum of air-gap and leakage
flux,
λ = λ + L i
dS agd S dS
λ = λ + L i
qS agq S qS
This means that we can re-write torque as:
3
T e = p (λ i −λ i )
agd qS agq dS
2
Next, note that the rotor flux is, similarly, related to air-gap flux:
λ = λ −L i
agd dR R dR
λ = λ −L i
agq qR R qR
Torque now becomes:
3 3
T e = p (λ i −λ i )− pL (i i −i i )
dR qS qR dS R dR qS qR dS
2 2
Now, since the rotor currents could be written as:
λ M
dR
i = − i
dR dS
L L
R R
λ M
qR
i = − i
qR qS
L L
R R
That second term can be written as:
1
i i −i i = (λ i −λ i )
dR qS qR dS dR qS qR dS
L
R
So that torque is now:
3 L 3 M
T e = p 1− R (λ i −λ i ) = p (λ i −λ i )
dR qS qR dS dR qS qR dS
2 L 2 L
 R R
6.9 Field-Oriented Strategy:
What is done in field-oriented control is to establish a rotor flux in a known position (usually this
position is the d- axis of the transformation) and then put a current on the orthogonal axis (where
it will be most effective in producing torque). That is, we will attempt to set
λ
= Λ0
dR
λ = 0
qR
Then torque is produced by applying quadrature-axis current:
3 M
T e = p Λ0 i
qS
2 L
R
The process is almost that simple. There are a few details involved in figuring out where the
quadrature axis is and how hard to drive the direct axis (magnetizing) current.
Now, suppose we can succeed in putting flux on the right axis, so that λ = 0, then the two
qR
rotor voltage equations are:
dλ
dR
0 = −ω λ + r I
s qR R dR
dt
dλ
qR
0 = + ω λ + r I
s dR R qR
dt
Now, since the rotor currents are:
λ M
dR
i = − i
dR dS
L L
R R
λ M
qR
i = − i
qR qS
L L
R R
The voltage expressions become, accounting for the fact that there is no rotor quadrature axis
flux:
dλ λ M
dR dR
0 = + r − i
R dS
dt L L
 R R 
M
0 = ω λ −r i
s dR R qS
L
R
Noting that the rotor time constant is
L
R
T =
R
r
R
we find:
dλ
dR
T + λ = Mi
R dR dS
dt
M i
qS
ω =
s
T λ
R dR
The first of these two expressions describes the behavior of the direct-axis flux: as one would
think,ithasasimple first-orderrelationship withdirect-axisstatorcurrent. Thesecondexpression,
which describes slip as a function of quadrature axis current and direct axis flux, actually describes
how fast to turn the rotating coordinate system to hold flux on the direct axis.
Now, a real machine applicationinvolves phase currents i , i and i , and these must be derived
a b c
from the model currents i and i . This is done with, of course, a mathematical operation which
dS qs
uses a transformation angle θ. And that angle is derived from the rotor mechanical speed and
computed slip:
θ = (pω + ω )dt
m s
 
Agenerallygoodstrategytomakethissort of systemworkistomeasurethethreephasecurrents
andderivethedirect-andquadrature-axiscurrentsfromthem. Agoodestimateofdirect-axisfluxis
made by running direct-axis flux through a first-order filter. The tricky operation involves dividing
quadrature axis current by direct axis flux to get slip, but this is now easily done numerically (as
are the trigonometric operations required for the rotating coordinate system transformation). An
elmentary block diagram of a (possbly) plausible scheme for this is shown in Figure 16.
In this picture we start with commanded values of direct- and quadrature- axis currents, corre­
sponding to flux and torque, respectively. These are translated by a rotating coordinate transfor­
mationintocommandedphasecurrents. Thattransformation(simplytheinversePark’stransform)
uses the angle q derived as part of the scheme. In some (cheap) implementations of this scheme
the commanded currents are used rather than the measured currents to establish the flux and slip.
∗
We have shown the commanded currents i , etc. as inputs to an “Amplifier”. This might be
a
implemented as a PWM current-source, for example, and a tight loop here results in a rather high
performance servo system.
θ
λ
dR
D M
ω 1 + ST
S a
N÷÷D T
M
N T
R
i* i
a
a
i* o
d i* i
T-1 b Amp b Motor
Load
i* o i c
q i*
c ω
m
θ ∫ Σ
Figure 16: Field Oriented Controller
References
[1] P.L. Alger, “Induction Machines”, Gordon and Breach, 1969
r 1 x 1
∧∧∧ ∩∩∩∩
∨∨
⊃ ⊃
⊃jx ⊃jx
⊃ 2s ⊃ 2c
⊃ < ⊃ ⊃ ⊃
⊃ ⊃jx ag < > > r c ⊃ ⊃x c
⊃ < ⊃
< <
> r2s
> r2c
<
<
> s > s
< <
⊃ ⊃
⊃jx ⊃jx
⊃ 2s5 ⊃ 2c5
⊃ ⊃ ⊃
⊃jx
⊃ a5
⊃
< <
> r2s5
> r2c5
<
<
> s5
> s5
<
<
⊃ ⊃
⊃jx ⊃jx
⊃ 2s7 ⊃ 2c7
⊃ ⊃ ⊃
⊃jx
⊃ a7
⊃
> r2s7 <
<
> r2c7
<
<
> s7
> s7
<
<
⊃ ⊃
⊃jx ⊃jx
⊃ 2sm ⊃ 2cm
⊃ ⊃ ⊃
⊃jx
⊃ am
⊃
< <
> r2sm > r2cm
< <
> sm > sm
< <
⊃ ⊃
⊃jx ⊃jx
⊃ 2sp ⊃ 2cp
⊃ ⊃ ⊃
⊃jx
⊃ ap
⊃
< > r2sp < > r2cp
< <
> sp > sp
< <
Figure 17: Extended Equivalent Circuit
Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes Chapter 11
DC (Commutator) and Permanent Magnet Machines ∗
J.L. Kirtley Jr.
1 Introduction
Virtually all electric machines, and all practical electric machines employ some form of rotating
or alternating field/current system to produce torque. While it is possible to produce a “true
DC” machine (e.g. the “Faraday Disk”), for practical reasons such machines have not reached
application and are not likely to. In the machines we have examined so far the machine is operated
from an alternating voltage source. Indeed, this is one of the principal reasons for employing AC
in power systems.
The firstelectricmachinesemployed amechanical switch,intheformof acarbonbrush/commutator
system, to produce this rotating field. While the widespread use of power electronics is making
“brushless” motors (which are really just synchronous machines) more popular and common, com­
mutator machines are still economically very important. They are relatively cheap, particularly in
small sizes, they tend to be rugged and simple.
You will find commutator machines in a very wide range of applications. The starting motor
on all automobiles is a series-connected commutator machine. Many of the other electric motors in
automobiles,fromthelittlemotorsthatdrivetheoutsiderear-viewmirrorstothemotorsthatdrive
the windshield wipers are permanent magnet commutator machines. The large traction motors
that drive subway trains and diesel/electric locomotives are DC commutator machines (although
induction machines are making some inroads here). And many common appliances use “universal”
motors: series connected commutator motors adapted to AC.
1.1 Geometry:
A schematic picture (“cartoon”) of a commutator type machine is shown in 1. The armature of
this machine is on the rotor (this is the part that handles the electric power), and current is fed to
the armature through the brush/commutator system. The interaction magnetic field is provided
∗ c2003 James L. Kirtley Jr.
Stator Yoke
Field Poles
Rotor Ω
Armature Winding
Field Winding
Figure 1: Wound-Field DC Machine Geometry
(in this picture) by a field winding. A permanent magnet field is applicable here, and we will have
quite a lot more to say about such arrangements below.
Now, if we assume that the interaction magnetic flux density averages B , and if there are C
r a
conductors underneath the poles at any one time, and if there are m parallel paths, then we may
estimate torque produced by the machine by:
C
a
T = R B I
e r a
m
where R and arerotorradiusandlength, respectively and I isterminal current. Notethat C
a a
is not necessarily the total number of conductors, but rather the total number of active conductors
(that is, conductors underneath the pole and therefore subject to the interaction field). Now, if we
note N as the number of field turns per pole, the interaction field is just:
f
N I
f f
B =
r
g
leading to a simple expression for torque in terms of the two currents:
T = GI I
e a f
where G is now the motor coefficient (units of N-m/ampere squared):
C N
a f
G = µ 0 R 
m g
Now, let’s go back and look at this from the point of view of voltage. Start with Faraday’s Law:
∂B 
E 
 ×
= −
∂t
Integrating both sides and noting that the area integral of a curl is the edge integral of the
quantity, we find:
∂B 
E · d = −
∂t
 

![이미지](images/page109_img00.webp)

Now, that is a bit awkward to use, particularly in the case we have here in which the edge of
the contour is moving (note we will be using this expression to find voltage). We can make this a
bit more convenient to use if we note:
where v' is the velocity of the contour. This gives us a convenient way of noting the apparent electric
field within a moving object (as in the conductors in a DC machine):
Figure 2: Motion of a contour through a magnetic field produces flux change and electric field in
the moving contour
Now, note that the armature conductors are moving through the magnetic field produced by
the stator (field) poles, and we can ascribe to them an axially directed electric field:
If the armature conductors are arranged as described above, with Ca conductors in m parallel
paths underneath the poles and with a mean active radial magnetic field of B,, we can compute a
voltage induced in the stator conductors:
Note that this is only the voltage induced by motion of the armature conductors through the
field and does not include brush or conductor resistance. If we include the expression for effective
magnetic field, we find that the back voltage is:
which leads us to the conclusion that newton-meters per ampere squared equals volt seconds per
ampere. This stands to reason if we examine electric power into the interaction and mechanical
power out:
Pe, = EbIa=TeR
Now, a more complete model of this machine would include the effects of armature, brush and
lead resistance, so that in steady state operation:
V = R I + GΩI
a a a f
Now, consider this machine with its armatucre connected to a voltage source and its field
operating at steady current, so that:
V −GΩI
a f
I =
a
R
a
R
a
+
+
V a G Ω I
f
-
-
Figure 3: DC Machine Equivalent Circuit
Then torque, electric power in and mechanical power out are:
V −GΩI
a f
T = GI
e f
R
a
V −GΩI
a f
P = V
e a
R
a
V −GΩI
a f
P = GΩI
m f
R
a
Now, note that these expressions define three regimes defined by rotational speed. The two
“break points” are at zero speed and at the “zero torque” speed:
V
a
Ω0 =
GI
f
For 0 < Ω < Ω0, the machine is a motor: electric power in and mechanical power out are both
positive. For higher speeds: Ω0 < Ω , the machine is a generator, with electrical power in and
mechanical power out being both negative. For speeds less than zero, electrical power in is positive
and mechanical power out is negative. There are few needs to operate machines in this regime,
short of some types of ”plugging” or emergency braking in tractions systems.
1.2 Hookups:
We have just described a mode of operation of a commutator machine usually called “separately
excited”, in which field and armature circuits are controlled separately. This mode of operation is
used in some types of traction applications in which the flexibility it affords is useful. For example,

| | Electrical |
| --- | --- |
| | Mechanical |

Figure 4: DC Machine Operating Regimes
R
a
+
G Ω I
f
-
Figure 5: Two-Chopper, separately excited machine hookup
some traction applications apply voltage control in the form of “choppers” to separately excited
machines.
Note that the “zero torque speed” is dependend on armature voltage and on field current.
For high torque at low speed one would operate the machine with high field current and enough
armature voltage to produce the requisite current. As speed increases so does back voltage, and
field current may need to be reduced. At any steady operating speed there will be some optimum
mixoffield and armaturecurrentstoproduced therequired torque. Forbrakingonecould(and this
is often done) re-connect the armature of the machine to a braking resistor and turn the machine
into a generator. Braking torque is controlled by field current.
A subset of the separately excited machine is the shunt connection in which armature and field
are supplied by the same source, in parallel. This connection is not widely used any more: it does
not yield any meaningful ability to control speed and the simple applications to which is used to
be used are mostly being handled by induction machines.
+
V
­
Figure 6: Series Connection
Anotherconnectionwhichisstill widely usedintheseriesconnection,inwhich the field winding
is sized so that its normal operating current level is the same as normal armature current and the
two windings are connected in series. Then:
V
I = I =
a f
R + R + GΩ
a f
And then torque is:
GV 2
T =
e
2
(R + R + GΩ)
a f
It is important to note that this machine has no “zero-torque” speed, leading to the possibility
that an unloaded machine might accelerate to dangerous speeds. This is particularly true because
the commutator, made of pieces of relatively heavy material tied together with non- conductors, is
not very strong.
Speed control of series connected machines can be achieved with voltage control and many
appliances using this type of machine use choppers or phase control. An older form of control
used in traction applications was the series dropping resistor: obviously not a very efficient way of
controlling the machine and not widely used (except in old equipment, of course).
Avariationonthisclassof machineisthevery widely used “universal motor”,inwhichthestator
and rotor (field and armature) of the machine are both constructed to operate with alternating
current. This means that both the field and armature are made of laminated steel. Note that such
a machine will operate just as it would have with direct current, with the only addition being the
reactive impedance of the two windings. Working with RMS quantities:
V
I =
R + R + GΩ+jω (L + L )
a f a f
|V |2
T =
e
2
2
(R + R + GΩ)
+(ωL + ωL )
a f a f
where ω is the electrical supply frequency. Note that, unlike other AC machines, the universal
motorisnotlimitedinspeed tothesupplyfrequency. Appliancemotorstypicallyturnsubstantially
faster than the 3,600 RPM limit of AC motors, and this is one reason why they are so widely used:
with thehigh rotational speedsitispossibletoproducemorepowerperunit mass(and morepower
per dollar).
1.3 Commutator:
The commutator is what makes this machine work. The brush and commutator system of this
class of motor involves quite a lot of “black art”, and there are still aspects of how they work
which are poorly understood. However, we can make some attempt to show a bit of what the
brush/commutator system does.
To start, take a look at the picture shown in Figure 7. Represented are a pair of poles (shaded)
and a pair of brushes. Conductors make a group of closed paths. Current from one of the brushes
takes two parallel paths. You can follow one of those paths around a closed loop, under each of
the two poles (remember that the poles are of opposite polarity) to the opposite brush. Open
commutator segments (most of them) do not carry current into or out of the machine.
Figure 7: Commutator and Current Paths
A commutation interval occurs when the current in one coil must be reversed. (See Figure 8
In the simplest form this involves a brush bridging between two commutator segments, shorting
out that coil. The resistance of the brush causes the current to decay. When the brush leaves the
leading segment the current in the leading coil must reverse.
Figure 8: Commutator at Commutation
We will not attempt to fully understand the commutation process in this type of machine, but
we can note a few things. Resistive commutation is the process relied upon in small machines.
When the current in one coil must be reversed (because it has left one pole and is approaching the
other), that coil is shorted by one of the brushes. The brush resistance causes the current in the
coil to decay. Then the leading commutator segment leaves the brush the current MUST reverse
(the trailing coil has current in it), and there is often sparking.
1.4 Commutation
Stator Yoke
Field Poles
Rotor Ω
Armature Winding
Field Winding
Commutation
Interpoles
Figure 9: Commutation Interpoles
In larger machines the commutation process would involve too much sparking, which causes
brush wear, noxious gases (ozone) that promote corrosion, etc. In these cases it is common to use
separate commutation interpoles. These are separate, usually narrow or seemingly vestigal pole
pieces which carry armature current. They are arranged in such a way that the flux from the
interpole drives current in the commutated coil in the proper direction. Remember that the coil
beingcommutatedislocatedphysicallybetweentheactivepolesand theinterpoleisthereforeinthe
right spot to influence commutation. The interpole is wound with armature current (it is in series
with the main brushes). It is easy to see that the interpole must have a flux density proportional
to the current to be commutated. Since the speed with which the coil must be commutated is
proportional to rotational velocity and so is the voltage induced by the interpole, if the right
number of turns are put around the interpole, commutation can be made to be quite accurate.
1.5 Compensation:
The analysis of commutator machines often ignores armature reaction flux. Obviously these ma­
chines DO produce armature reaction flux, in quadrature with the main field. Normally, commuta­
tor machines are highly salient and the quadrature inductance is lower than direct-axis inductance,
but there is still flux produced. This adds to the flux density on one side of the main poles (pos­
sibly leading to saturation). To make the flux distribution more uniform and therefore to avoid
this saturation effect of quadrature axis flux, it is common in very highly rated machines to wind
compensation coils: essentially mirror-images of the armature coils, but this time wound in slots
in the surface of the field poles. Such coils will have the same number of ampere-turns as the
Field Poles
Pole−Face
Compensation
Winding
Rotor Ω
Armature Winding
Field Winding
Commutation
Interpoles
Figure 10: Pole Face Compensation Winding
armature. Normally they have the same number of turns and are connected directly in series with
the armature brushes. What they do is to almost exactly cancel the flux produced by the armature
coils, leaving only the main flux produced by the field winding. One might think of these coils as
providing a reaction torque, produced in exactly the same way as main torque is produced by the
armature. A cartoon view of this is shown in Figure 10.
2 Permanent Magnets in Electric Machines
Of all changes in materials technology over the last several years, advances in permanent magnets
have had the largestimpact on electricmachines. Permanent magnetsare oftensuitableas replace­
ments for the field windings in machines: that is they can produce the fundamental interaction
field. This does three things. First, since the permanent magnet is lossless it eliminates the energy
required for excitation, usually improving the efficiency of the machine. Second, since eliminating
the excitation loss reduces the heat load it is often possible to make PM machines more compact.
Finally, and less appreciated, is the fact that modern permanent magnets have very large coercive
forcedensitieswhichpermit vastlylargerairgapsthanconventional field windings, and thisinturn
permits design flexibility which can result in even better electric machines.
These advantages come not without cost. Permanent magnet materials have special character­
istics which must be taken into account in machine design. The highest performance permanent
magnetsarebrittleceramics,somehavechemical sensitivities,all aresensitivetohightemperatures,
most have sensitivity to demagnetizing fields, and proper machine design requires understanding
the materials well. These notes will not make you into seasoned permanent magnet machine de­
signers. They are, however, an attempt to get started, to develop some of the mathematical skills
required and to point to some of the important issues involved.
2.1 Permanent Magnets:
Hysteresis Loop: Permanent Magnet
1

| 0.80.60.40.20 | |
| --- | --- |
| 00 -300 -200 -100- 0.2 0-0.4-0.6-0.8-1 | 100 200 300 4 |

alseT
-40 0
Kilo Am peres/Meter
Figure 11: Hysteresis Loop Of Ceramic Permanent Magnet
Permanent magnet materials are, at core, just materials with very wide hysteresis loops. Fig­
ure 11 is an example of something close to one of the more popular ceramic magnet materials.Note
that this hysteresis loop is so wide that you can see the effect of the permeability of free space.
Demagnetization Curve
0.5
0.45
0.4
Energy Product Loci Br
0.35
0.3
alseT
0.25
,B
0.2
0.15
0.1
Hc
0.05
0
-250 -200 -150 -100 -50 0
H, kA/m
Figure 12: Demagnetization Curve
It is usual to display only part of the magnetic characteristic of permanent magnet materials
(see Figure 12), the third quadrant of this picture, because that is where the material is normally
operated. Note a few important characteristics of what is called the “demagnetization curve”. The
remanent flux density B , is the value of flux density in the material with zero magnetic field H.
r
The coercive field H is the magnetic field at which the flux density falls to zero. Shown also on
c
the curve are loci of constant energy product. This quantity is unfortunately named, for although
it has the same units as energy it represents real energy in only a fairly general sense. It is the
product of flux density and field intensity. As you already know, there are three commonly used
systems of units for magnetic field quantities, and these systems are often mixed up to form very
confusing units. We will try to stay away from the English system of units in which field intensity
H is measured in amperes per inch and flux density B in lines (actually, usually kilolines) per
square inch. In CGS units flux density is measured in Gauss (or kilogauss) and magnetic field
intensity in Oersteds. And in SI the unit of flux density is the Tesla, which is one Weber per square
meter, and the unit of field intensity is the Ampere per meter. Of these, only the last one, A/m is
−4
obvious. A Weber is a volt-second. A Gauss is 10
Tesla. And, finally, an Oersted is that field
intensity required to produce one Gauss in the permeability of free space. Since the permeability
−7Hy/m,
of free space µ 0 = 4π × 10
this means that one Oe is about 79.58 A/m. Commonly, the
energy product is cited in MgOe (Mega-Gauss-Oersted)s. One MgOe is equal to 7.958kJ/m3 . A
commonly used measure for the performance of a permanent magnet material is the maximum
energy product, the largest value of this product along the demagnetization curve.
To start to understand how these materials might be useful, consider the situation shown in
Figure 13: A piece of permanent magnet material is wrapped in a magnetic circuit with effectively
infinitepermeability. Assume thething has some(finite)depthinthedirectionyoucan’t see. Now,
if we take Ampere’s law around the path described by the dotted line,
d 
H 
·
= 0
 
since there is no current anywhere in the problem. If magnetization is upwards, as indicated by
the arrow, this would indicate that the flux density in the permanent magnet material is equal to
the remanent flux density (also upward).
Permanent Magnet
Magnetic Circuit, µ→∞
Figure 13: Permanent Magnet in Magnetic Circuit
A second problem is illustrated in Figure 14, in which the same magnet is embedded in a
magnetic circuit with an air gap. Assume that the gap has width g and area Ag. The magnet has
height hm and area Am. For convenience, we will take the positive reference direction to be up (as
we see it here) in the magnet and down in the air-gap.
Permanent Magnet
g
h
m
Magnetic Circuit, µ→∞
Figure 14: Permanent Magnet Driving an Air-Gap
Thus we are following the same reference direction as we go around the Ampere’s Law loop.
That becomes:
H · d = H h + H g
m m g
 
Now, Gauss’ law could be written for either the upper or lower piece of the magnetic circuit.
Assuming that the only substantive flux leaving or entering the magnetic circuit is either in the
magnet or the gap:
 B · dA = B m A m −µ 0 H g A g
 
Solving this pair we have:
A h
g m
B m = −µ 0 H m = µ 0P u H m
A g
m
This defines the unit permeance, essentially the ratio of the permeance facing the permanent
magnet to the internal permeance of the magnet. The problem can be, if necessary, solved graph­
ically, since the relationship between B and H is inherently nonlinear, as shown in Figure 15
m m
“load line” analysis of a nonlinear electronic circuit.
Now, one more ‘cut’ at this problem. Note that, at least for fairly large unit permeances the
slope of the magnet characteristic is fairly constant. In fact, for most of the permanent magnets
used in machines (the one important exception is the now rarely used ALNICO alloy magnet), it
is generally acceptable to approximate the demagnitization curve with:
B m = µ m H m + M 0
 
Here, the magnetization M 0 is fixed. Further, for almost all of the practical magnet materials
the magnet permeability is nearly the same as that of free space (µ
≈ µ 0). With that in mind,
m
−µ ℘
0 u
Figure 15: Load Line, Unit Permeance Analysis
consider the problem shown in Figure 16, in which the magnet fills only part of a gap in a magnetic
circuit. But here the magnet and gap areas are essentially the same. We could regard the magnet
as simply a magnetization.
Permanent Magnet
Magnetic Circuit, µ→∞
Figure 16: Surface Magnet Primitive Problem
In the region of the magnet and the air-gap, Ampere’s Law and Gauss’ law can be written:
H 
 ×
= 0
 · µ 0 H m + M 0 = 0
 
H 
 · µ 0
g = 0
Now, if in the magnet the magnetization is constant, the divergence of H in the magnet is zero.
Because there is no current here, H is curl free, so that everywhere:
H = − ψ
2ψ
 
= 0
That is, magnetic field can be expressed as the gradient of a scalar potential which satisfies
Laplace’s equation. It is also pretty clear that, if we can assign the scalar potential to have a value
of zero anywhere on the surface of the magnetic circuit it will be zero over all of the magnetic
circuit (i.e. at both the top of the gap and the bottom of the magnet). Finally, note that we can’t
actually assume that the scalar potential satisfies Laplace’s equation everywhere in the problem.
In fact the divergence of M is zero everywhere except at the top surface of the magnet where it is
singular! In fact, we can note that there is a (some would say fictitious) magnetic charge density:
ρ = − · M 
m
At the top of the magnet there is a discontinuous change in M and so the equivalent of a
magnetic surface charge. Using H to note the magnetic field above the magnet and H to note
g m
the magnetic field in the magnet,
µ 0 H g = µ 0 (H m + M 0)
σ m = M 0 = H g −H m
and then to satisfy the potential condition, if hm is the height of the magnet and g is the gap:
gH = h H
g m m
Solving,
h
m
H g = M 0
h + g
m
Now, one more observation could be made. We would produce the same air-gap flux density
if we regard the permanent magnet as having a surface current around the periphery equal to the
magnetization intensity. That is, if the surface current runs around the magnet:
K φ = M 0
This would produce an MMF in the gap of:
F = K h
φ m
and then since the magnetic field is just the MMF divided by the total gap:
F h
m
H g = = M 0
h + g h + g
m m
The real utility of permanent magnets comes about from the relatively large magnetizations:
numbers of a few to several thousand amperes per meter are common, and these would translate
into enormous current densities in magnets of ordinary size.
3 Simple Permanent Magnet Machine Structures: Commutator
Machines
Figure 17 is a cartoon picture of a cross section of the geometry of a two-pole commutator machine
using permanent magnets. This is actually the most common geometry that is used. The rotor
(armature) of the machine is a conventional, windings-in-slots type, just as we have already seen
Stator Yoke
Ω
Armature Winding
Field Magnets
Rotor
Figure 17: PM Commutator Machine
for commutator machines. The field magnets are fastened (often just bonded) to the inside of a
steel tube that serves as the magnetic flux return path.
Assume for the purpose of first-order analysis of this thing that the magnet is describable by its
and had permeability of µ 0. First, we will estimate the useful magnetic
remanent flux density B
r
flux density and then will deal with voltage generated in the armature. Interaction Flux Density
Using the basics of the analysis presented above, we may estimate the radial magnetic flux density
at the air-gap as being:
B
r
B =
d
1
1+
P
c
where the effective unit permeance is:
f h A
l m g
P =
c
f g A
f m
A book on this topic by James Ireland suggests values for the two “fudge factors”:
1. The “leakage factor” f is cited as being about 1.1.
l
2. The “reluctance factor” f is cites as being about 1.2.
f
We may further estimate the ratio of areas of the gap and magnet by:
A R + g
g 2
=
A m R + g + h 2 m
Now, there are a bunch of approximations and hand wavings in this expression, but it seems to
work, at least for the kind of machines contemplated.
A second correction is required to correct the effective length for electrical interaction. The
reason for this is that the magnets produce fringing fields, as if they were longer than the actual
”stack length” of the rotor (sometimes they actually are). This is purely empirical, and Ireland
gives a value for effective length for voltage generation of:
∗
 
 =
eff
f
 
∗
where = +2NR , and the empirical coefficient
A h
m
N ≈ log 1+B
B R
 
where
h
m
B = 7.4−9.0
R
A = 0.9
3.0.1 Voltage:
It is, in this case, simplest to consider voltage generated in a single wire first. If the machine is
running at angular velocity Ω, speed voltage is, while the wire is under a magnet,
v = ΩR B
s r
Now, if the magnets have angular extent θ the voltage induced in a wire will have a waveform
m
as shown in Figure 18: It is pulse-like and has the same shape as the magnetic field of the magnets.
v
s π
Ω t
θ
m
Figure 18: Voltage Induced in One Conductor
The voltage produced by a coil is actually made up of two waveforms of exactly this form, but
separated in time by the ”coil throw” angle. Then the total voltage waveform produced will be
the sum of the two waveforms. If the coil thrown angle is larger than the magnet angle, the two
voltage waveforms add to look like this: There are actually two coil-side waveforms that add with
a slight phase shift.
If, on the other hand, the coil thrown is smaller than the magnet angle, the picture is the same,
only the width of the pulses is that of the coil rather than the magnet. In either case the average
voltage generated by a coil is:
∗
θ
v =ΩR N B
s d
π
v
c
0
m
0
m
Figure 19: Voltage Induced in a Coil
∗
where θ is the lesser of the coil throw or magnet angles and N is the number of series turns in
s
the coil. This gives us the opportunity to develop the number of “active” turns:
∗ ∗
C θ C θ
a tot
= N =
s
m π m π
Here, C a is the number of active conductors, C tot is the total number of conductors and m is the
number of parallel paths. The motor coefficient is then:
R eff C tot B d θ ∗
K =
m π
3.1 Armature Resistance
The last element we need for first-order prediction of performance of the motor is the value of
armature resistance. The armature resistance is simply determined by the length and area of the
wire and by the number of parallel paths (generally equal to 2 for small commutator motors). If
we note N as the number of coils and N as the number of turns per coil,
c a
N N
c a
N =
s
m
Total armature resistance is given by:
N
s
R = 2ρ 
a w t
m
where ρ is the resistivity (per unit length) of the wire:
w
1
ρ =
w πd2 σ
4 w w
(d iswire diameter, σ iswire conductivity and islength of one half-turn). This lengthdepends
w w t
on how the machine is wound, but a good first-order guess might be something like this:
 ≈ + πR
t
Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes Chapter 12
Permanent Magnet “Brushless DC” Motors ∗
J.L. Kirtley Jr.
1 Introduction
This document is a brief introduction to the design evaluation of permanent magnet motors, with
an eye toward servo and drive applications. It is organized in the following manner: First, we
describe three different geometrical arrangements for permanent magnet motors:
1. Surface Mounted Magnets, Conventional Stator,
2. Surface Mounted Magnets, Air-Gap Stator Winding, and
3. Internal Magnets (Flux Concentrating).
After a qualitative discussion of these geometries, we will discuss the elementary rating param­
eters of the machine and show how to arrive at a rating and how to estimate the torque and power
vs. speed capability of the motor. Then we will discuss how the machine geometry can be used to
estimate both the elementary rating parameters and the parameters used to make more detailed
estimates of the machine performance.
Some of the more involved mathematical derivations are contained in appendices to this note.
2 Motor Morphologies
There are, of course, many ways of building permanent magnet motors, but we will consider only a
few in this note. Actually, once these are understood, rating evaluations of most other geometrical
arrangements should be fairly straightforward. It should be understood that the “rotor inside” vs.
“rotor outside” distinction is in fact trivial, with very few exceptions, which we will note.
∗ c2003 James L. Kirtley Jr.
2.1 Surface Magnet Machines
Figure 1 shows the basic magnetic morphology of the motor with magnets mounted on the surface
of the rotor and an otherwise conventional stator winding. This sketch does not show some of
the important mechanical aspects of the machine, such as the means for fastening the permanent
magnets to the rotor, so one should look at it with a bit of caution. In addition, this sketch and
the other sketches to follow are not necessarily to a scale that would result in workable machines.
Stator Core
Rotor Core
Stator Windings
in Slots
Rotor
Magnets
Figure 1: Axial View of a Surface Mount Motor
This figure shows an axial section of a four-pole (p = 2) machine. The four magnets are
mounted on a cylindrical rotor “core”, or shaft, made of ferromagnetic material. Typically this
would simply be a steel shaft. In some applications the magnets may be simply bonded to the
steel. For applications in which a glue joint is not satisfactory (e.g. for high speed machines) some
sort of rotor banding or retaining ring structure is required.
Thestatorwindingof thismachineis “conventional”,very muchlikethat of aninductionmotor,
consisting of wires located in slots in the surface of the stator core. The stator core itself is made of
laminated ferromagnetic material (probably silicon iron sheets), the character and thickness of the
sheets determined by operating frequency and efficiency requirements. They are required to carry
alternating magnetic fields, so must be laminated to reduce eddy current losses.
This sort of machine is simplein construction. Note that the operating magnetic flux density in
the air-gap is nearly the same as in the magnets, so that this sort of machine cannot have air-gap
flux densities higher than that of the remanent flux density of the magnets. If low cost ferrite
magnets are used, this means relatively low induction and consequently relatively low efficiency
and power density. (Note the qualifier “relatively” here!). Note, however, that with modern, high
performance permanent magnet materials in which remanent flux densities can be on the order of
1.2 T, air-gap working flux densities can be on the order of 1 T. With the requirement for slots to
carry the armature current, this may be a practical limit for air-gap flux density anyway.
It is also important to note that the magnets in this design are really in the “air gap” of
the machine, and therefore are exposed to all of the time- and space- harmonics of the stator
winding MMF. Because some permanent magnets have electrical conductivity (particularly the
higher performance magnets), any asynchronous fields will tend to produce eddy currents and
consequent losses in the magnets.
2.2 Interior Magnet or Flux Concentrating Machines
Interior magnet designs have been developed to counter several apparent or real shortcomings of
surface mount motors:
• Flux concentrating designs allow the flux density in the air-gap to be higher than the flux
density in the magnets themselves.
• In interior magnet designs there is some degree of shielding of the magnets from high order
space harmonic fields by the pole pieces.
• There are control advantages to some types of interior magnet motors, as we will show anon.
Essentially, they have relatively large negative saliency which enhances “flux weakening” for
high speed operation, in rather direct analogy the what is done in DC machines.
• Some types of internal magnet designs have (or claim) structural advantages over surface
mount magnet designs.
Stator Core Armature Winding
in Slots
Non−Magnetic
Rotor Core
Rotor
Magnets
Rotor Pole
Pieces
Figure 2: Axial View of a Flux Concentrating Motor
The geometry of one type of internal magnet motor is shown (crudely) in Figure 2. The
permanentmagnetsareoriented sothattheirmagnetizationisazimuthal. Theyarelocatedbetween
wedges of magnetic material (the pole pieces) in the rotor. Flux passes through these wedges,
going radially at the air- gap, then azimuthally through the magnets. The central core of the rotor
must be non-magnetic, to prevent “shorting out” the magnets. No structure is shown at all in
this drawing, but quite obviously this sort of rotor is a structural challenge. Shown is a six-pole
machine. Typically, one does not expect flux concentrating machines to have small pole numbers,
because it is difficult to get more area inside the rotor than around the periphery. On the other
hand, a machine built in this way but without substantial flux concentration will still have saliency
and magnet shielding properties.
Stator Core
Stator Slots
Air Gap
Rotor
Saliency Slots
Figure 3: Axial View of Internal Magnet Motor
A second morphology for an internal magneti motor is shown in Figure 3. This geometry
has been proposed for highly salient synchronous machines without permanent magnets: such
machines would run on the saliency torque and are called synchronous reluctance motors. however,
the saliency slots may be filled with permanent magnet material, giving them some internally
generated flux as well. The rotor iron tends to short out the magnets, so that the ’bridges’ around
the ends of the permanent magnets must be relatively thin. They are normally saturated.
At first sight, these machines appear to be quite complicated to analyze, and that judgement
seems to hold up.
2.3 Air Gap Armature Windings
Shown in Figure 4 is a surface-mounted magnet machine with an air-gap, or surface armature
winding. Such machines take advantage of the fact that modern permanent magnet materials have
very low permeabilities and that, therefore, the magnetic field produced is relatively insensitive to
the size of the air-gap of the machine. It is possible to eliminate the stator teeth and use all of the
periphery of the air-gap for windings.
Not shown in this figure is the structure of the armature winding. This is not an issue in
“conventional” stators, since the armature is contained in slots in the iron stator core. The use of
an air-gap winding gives opportunities for economy of construction, new armature winding forms
such as helical windings, elimination of “cogging” torques, and (possibly) higher power densities.

![이미지](images/page128_img00.webp)

Stator Back I r o o
Figure 4: Axial View of a PM Motor With an Air-Gap Winding
3 Zeroth Order Rating
In determining the rating of a machine, we may consider two separate sets of parameters. The first
set, the elementary rating parameters, consist of the machine inductances, internal flux linkage and
stator resistance. From these and a few assumptions about base and maximum speed it is possible
to get a first estimate of the rating and performance of the motor. More detailed performance
estimates, including efficiency in sustained operation, require estimation of other parameters. We
will pay more attention to that first set of parameters, but will attempt to show how at least some
of the more complete operating parameters can be estimated.
3.1 Voltage and Current: Round Rotor
To get started, consider the equivalent circuit shown in Figure 5. This is actually the equivalent
circuit which describes all round rotor synchronous machines. It is directly equivalent only to some
of the machines we are dealing with here, but it will serve to illustrate one or two important points.
What is shown here is the equivalent circuit of a single phase of the machine. Most motors
are three-phase, but it is not difficult to carry out most of the analysis for an arbitrary number
of phases. The circuit shows an internal voltage Ea and a reactance X which together with the
terminal current I determine the terminal voltage V. In this picture armature resistance is ignored.
If the machine is running in the sinusoidal steady state, the major quantities are of the form:
+
Ea = wAa cos (wt 6)
& = Vcoswt
I, = Icos (wt +)
-
The machine is in synchronous operation if the internal and external voltages are at the same
X I
 a
∩∩∩∩
+
 + 
E V
− a t
-
 
Figure 5: Synchronous Machine Equivalent Circuit
I
 
 
 
 
 ψ V
 
 
 
 
 δ 
 
 
 jXI
 
 
 
 
 
 
E
a
Figure 6: Phasor Diagram For A Synchronous Machine
frequencyandhaveaconstant(orslowly changing)phaserelationship(δ). Therelationshipbetween
the major variables may be visualized by the phasor diagram shown in Figure 3.1. The internal
voltage is just the time derivative of the internal flux from the permanent magnets, and the voltage
drop in the machine reactance is also the time derivative of flux produced by armature current in
the air-gap and in the “leakage” inductances of the machine. By convention, the angle ψ is positive
when current I lags voltage V and the angle δ is positive then internal voltage E leads terminal
a
voltage V . So both of these angles have negative sign in the situation shown in Figure 3.1.
If there are q phases, the time average power produced by this machine is simply:
q
P = VI cosψ
2
For most polyphase machines operating in what is called “balanced” operation (all phases doing
the same thing with uniform phase differences between phases), torque (and consequently power)
are approximately constant. Since we have ignored power dissipated in the machine armature, it
must be true that power absorbed by the internal voltage source is the same as terminal power, or:
q
P = E I cos(ψ −δ)
a
2
Since in the steady state:
ω
P = T
p
where T is torque and ω/p is mechanical rotational speed, torque can be derived from the terminal
quantities by simply:
q
T = p λ I cos(ψ −δ)
a
2
In principal, then, to determine the torque and hence power rating of a machine it is only
necessary to determine the internal flux, the terminal current capability, and the speed capability
of the rotor. In fact it is almost that simple. Unfortunately, the model shown in Figure 5 is not
quite complete for some of the motors we will be dealing with, and we must go one more level into
machine theory.
3.2 A Little Two-Reaction Theory
The material in this subsection is framed in terms of three-phase (q = 3) machine theory, but
it is actually generalizable to an arbitrary number of phases. Suppose we have a machine whose
three-phasearmaturecanbecharacterizedby internal fluxesandinductancewhich may, ingeneral,
not be constant but is a function of rotor position. Note that the simple model we presented in
the previous subsection does not conform to this picture, because it assumes a constant terminal
inductance. In that case, we have:
λ = L I + λ (1)
ph ph ph R
where λ is the set of internally produced fluxes (from the permanent magnets) and the stator
R
winding may have both self- and mutual- inductances.
Now, we find it useful to do a transformation on these stator fluxes in the following way: each
armature quantity, including flux, current and voltage, is projected into a coordinate system that
is fixed to the rotor. This is often called the Park’s Transformation. For a three phase machine it
is:
u u
d a
= u
u
u
= Tu
= T
(2)
q ⎤
b ⎤
dq
ph
⎡
⎡
u u
0 c
⎢ ⎥ ⎢ ⎥
⎣ ⎦ ⎣ ⎦
Where the transformation and its inverse are:
cosθ cos(θ − 2π ) cos(θ + 2π)
2 3 3
T = −sinθ −sin(θ − 2π ) −sin(θ + 2π) (3)
3 ⎡ 1 1 3 1 3 ⎤
2 2 2
⎥
⎢
⎣ ⎦
cosθ −sinθ 1
T −1 = cos(θ − 2π ) −sin(θ − 2π) 1 (4)
⎡ 3 3 ⎤
cos(θ + 2π ) −sin(θ + 2π) 1
3 3
⎢ ⎥
⎣ ⎦
It is easy to show that balanced polyphase quantities in the stationary, or phase variable frame,
translate into constant quantities in the so-called “d-q” frame. For example:
I = I cosωt
a
2π
I = I cos(ωt − )
b
3
2π
I = I cos(ωt + )
c
3
θ = ωt + θ 0
maps to:
I d = I cosθ 0
I q = −I sinθ 0
Now, if θ = ωt +θ 0, the transformation coordinate system is chosen correctly and the “d-” axis
will correspond with the axis on which the rotor magnets are making positive flux. That happens
if, when θ = 0, phase A is linking maximum positive flux from the permanent magnets. If this is
the case, the internal fluxes are:
λ = λ cosθ
aa f
2π
λ = λ cos(θ − )
ab f
3
2π
λ = λ cos(θ + )
ac f
3
Now, if we compute the fluxes in the d-q frame, we have:
−1I
λ = L I + λ = TL T
+ λ (5)
dq dq dq R ph dq R
Now: two things should be noted here. The first is that, if the coordinate system has been chosen
as described above, the flux induced by the rotor is, in the d-q frame, simply:
λ
f
λ = 0 (6)
R ⎡ ⎤
0
⎢ ⎥
⎣ ⎦
That is, the magnets produce flux only on the d- axis.
The second thing to note is that, under certain assumptions, the inductances in the d-q frame
are independent of rotor position and have no mutual terms. That is:
L 0 0
d
−1
0 L
L
= T L
T
0
=
(7)
q
⎡
⎤
dq
ph
0 0 L 0
⎢ ⎥
⎣ ⎦
The assertion that inductances in the d-q frame are constant is actually questionable, but it is
close enough to being true and analyses that use it have proven to be close enough to being correct
that it (the assertion) has held up to the test of time. In fact the deviations from independence
on rotor position are small. Independence of axes (that is, absence of mutual inductances in the
d-q frame) is correct because the two axes are physically orthogonal. We tend to ignore the third,
or “zero” axis in this analysis. It doesn’t couple to anything else and has neither flux nor current
anyway. Note that the direct- and quadrature- axis inductances are in principle straightforward to
compute. They are
direct axis theinductanceof oneof thearmaturephases(correctedforthefact of multiplephases)
with the rotor aligned with the axis of the phase, and
quadrature axis the inductance of one of the phases with the rotor aligned 90 electrical degrees
away from the axis of that phase.
Next, armature voltage is, ignoring resistance, given by:
d d
−1λ
V = λ = T
(8)
ph dt ph dt dq
and that the transformed armature voltage must be:
V = TV
dq ph
d
−1λ
= T (T
)
dt dq
d d
−1
= λ +(T T
)λ (9)
dt dq dt dq
The second term in this expresses “speed voltage”. A good deal of straightforward but tedious
manipulation yields:
0 −dθ 0
dt
d
T −1 = dθ 0
T
0 (10)
dt ⎡ dt ⎤
0 0 0
⎢ ⎥
⎣ ⎦
The direct- and quadrature- axis voltage expressions are then:
dλ
d
V = −ωλ (11)
d q
dt
dλ
q
V = + ωλ (12)
q d
dt
where
dθ
ω =
dt
Instantaneous power is given by:
P = V I + V I + V I (13)
a a b b c c
Using the transformations given above, this can be shown to be:
3 3
P = V d I d + V q I q +3V 0 I 0 (14)
2 2
which, in turn, is:
3 3 dλ d dλ q dλ 0
P = ω (λ d I q −λ q I d )+ ( I d + I q )+3 I 0 (15)
2 2 dt dt dt
Then, noting that ω = pΩ and that (15) describes electrical terminal power as the sum of shaft
power and rate of change of stored energy, we may deduce that torque is given by:
q
T = p(λ I −λ I ) (16)
d q q d
2
Note that we have stated a generalization to a q- phase machine even though the derivation
given here was carried out for the q = 3 case. Of course three phase machines are by far the
most common case. Machines with higher numbers of phases behave in the same way (and this
generalization is valid for all purposes to which we put it), but there are more rotor variables
analogous to “zero axis”.
Now, noting that, in general, L and L are not necessarily equal,
d q
λ = L I + λ (17)
d d d f
λ = L I (18)
q q q
then torque is given by:
q
T = p (λ +(L −L )I )I (19)
f d q d q
2
3.3 Finding Torque Capability
For high performance drives, we will generally assume that the power supply, generally an inverter,
can supply currents in the correct spatial relationship to the rotor to produce torque in some
reasonably effective fashion. We will show in this section how to determine, given a required torque
(or if the torque is limited by either voltage or current which we will discuss anon), what the
values of I and I must be. Then the power supply, given some means of determining where the
d q
rotor is (the instantaneous value of θ), will use the inverse Park’s transformation to determine the
instantaneous valued required for phase currents. This is the essence of what is known as “field
oriented control”, orputting statorcurrentsin the correct location in space to produce therequired
torque.
Ourobjectiveinthissectionis,giventheelementaryparametersofthemotor, findthecapability
of the motor to produce torque. There are three things to consider here:
• Armature current is limited, generally by heating,
• A second limit is the voltage capability of the supply, particularly at high speed, and
• If the machine is operating withinthese two limits, we should considerthe optimal placement
of currents (that is, how to get the most torque per unit of current to minimize losses).
Oftenthediscussionofcurrentplacementiscarried out using,asatool tovisualizewhatisgoing
on, the I , I plane. Operation in the steady state implies a single point on this plane. A simple
d q
illustration is shown in Figure 7. The thermally limited armature current capability is represented
as a circle around the origin, since the magnitude of armature current is just the length of a vector
from the origin in this space. Note that since in general, for permanent magnet machines with
iq
Current Limit Locus
Optimal Torque
Locus
Voltage Limit
Locus
id
Short Circuit
Point
Figure 7: Limits to Operation
buried magnets, L < L , so the optimal operation of the machine will be with negative I . We
d q d
will show how to determine this optimum operation anon, but it will in general follow a curve in
the I , I plane as shown.
d q
Finally, an ellipse describes the voltage limit. To start, consider what would happen if the
terminals of the machine were to be short-circuited so that V = 0. If the machine is operating at
sufficiently high speed so that armature resistance is negligible, armature current would be simply:
λ
f
I = −
d
L
d
I = 0
q
Now, loci of constant flux turn out to be ellipses around this point on the plane. Since terminal
flux is proportional to voltage and inversely proportional to frequency, if the machine is operating
with a given terminal voltage, the ability of that voltage to command current in the I , I plane is
d q
an ellipse whose size “shrinks” as speed increases.
To simplify the mathematics involved in this estimation, we normalize reactances, fluxes, cur­
rents and torques. First, let us define the base flux to be simply λ = λ and the base current I to
b f b
be the armature capability. Then we define two per-unit reactances:
L I
d b
x = (20)
d
λ
b
L I
q b
x = (21)
q
λ
b
Next, define the base torque to be:
q
T = p λ I
b b b
2
and then, given per-unit currents i and i , the per-unit torque is simply:
d q
t = (1−(x −x )i )i (22)
e q d d q
Itisfairlystraightforward(but abittedious)toshowthatthelocusof current-optimal operation
(that is, the largest torque for a given current magnitude or the smallest current magnitude for a
given torque) is along the curve:
2
2
i2
i2 1
1 1
a +2
a (23)
i
−
+
= − 
d
2(x q −x d ) 4(x q −x d ) 
 2
 4(x q −x d ) 
2
 
 
 
 
2
2
i2 1
i2
1 1
i q = − 2 a −2 4(x q −x d ) + 2(x q −x d ) 4(x q −x d ) + 2 a (24)
 
 
The “rating point” will be the point along this curve when i = 1, or where this curve crosses the
a
armature capability circle in the i , i plane. It should be noted that this set of expressions only
d q
works for salient machines. For non-salient machines, of course, torque-optimal current is on the
q-axis. In general, for machines with saliency, the “per-unit” torque will not be unity at the rating,
so that the rated, or “Base Speed” torque is not the “Base” torque, but:
T = T × t (25)
r b e
where t is calculated at the rating point (that is, i =1 and i and i as per (23) and (24)).
e a d q
For sufficiently low speeds, the power electronic drive can command the optimal current to
produce torque up to rated. However, for speeds higher than the “Base Speed”, this is no longer
true. Define a per-unit terminal flux:
V
ψ =
ωλ
b
Operation at a given flux magnitude implies:
ψ2 = (1+x i ) 2 +(x i ) 2
d d q q
which is an ellipse in the i , i plane. The Base Speed is that speed at which this ellipse crosses the
d q
point where the optimal current curve crosses the armature capability. Operation at the highest
attainable torque (for a given speed) generally implies d-axis currents that are higher than those
on the optimal current locus. What is happening here is the (negative) d-axis current serves to
reduce effective machine flux and hence voltage which is limiting q-axis current. Thus operation
above the base speed is often referred to as “flux weakening”.
The strategy for picking the correct trajectory for current in the i , i plane depends on the
d q
valueof theper-unit reactance x . Forvaluesof x > 1, itispossibletoproduce some torqueat any
d d
speed. Forvaluesof x < 1, thereisaspeedforwhich nopointinthearmaturecurrent capabilityis
d
within the voltage limiting ellipse, so that useful torque has gone to zero. Generally, the maximum
torque operating point is the intersection of the armature current limit and the voltage limiting
ellipse:
x x 2 x2−ψ2 +1
d d q
i = − + (26)
d x2
−x2
−x2
−x2
x2
x2
 
 
d 
d 
q
q
q
d
 
 
i = 1−i2 (27)
q d
 
Table 1: Example Machine
D- Axis Inductance 2.53 mHy
Q- Axis Inductance 6.38 mHy
Internal Flux 58.1 mWb
Armature Current 30 A
Table 2: Operating Characteristics of Example Machine
Per-Unit D-Axis Current At Rating Point i -.5924
d
Per-Unit Q-Axis Current At Rating Point i .8056
q
Per-Unit D-Axis Reactance x 1.306
d
Per-Unit Q-Axis Reactance x 3.294
q
Rated Torque (Nm) T 9.17
r
Terminal Voltage at Base Point (V) 97
It may be that there is no intersectionbetween the armature capability and the voltage limiting
ellipse. If this is the case and if x < 1, torque capability at the given speed is zero.
d
If, on the other hand, x > 1, it may be that the intersection between the voltage limiting
d
ellipse and the armature current limit is not the maximum torque point. To find out, we calculate
the maximum torque point on the voltage limiting ellipse. This is done in the usual way by
differentiating torque with respect to i while holding the relationship between i and i to be on
d d q
the ellipse. The algebra is a bit messy, and results in:
2
3x (x −x )−x2 3x (x −x )−x2
(x −x )(ψ2 −1)+x
i = − d q d d − d q d d + q d d (28)
d 4x d 2 (x q −x d ) 4x d 2 (x q −x d ) 2(x q −x d )x d 2
 
1 
i = ψ2 −(1+x i ) 2 (29)
q d d
x
q
 
Ordinarily, it is probably easiest to compute (28) and (29) first, then test to see if the currents
are outside the armature capability, and if they are, use (26) and (27).
These expressions give us the capability to estimate the torque-speed curve for a machine. As
an example, the machine described by the parameters cited in Table 1 is a (nominal) 3 HP, 4-pole,
3000 RPM machine.
The rated operating point turns out to have the following attributes:
The loci of operation in the I , I plane is shown in Figure 8. The armature current limit
d q
is shown only in the second and third quadrants, so shows up as a semicircle. The two ellipses
correspond with the rated point (the larger ellipse) and with a speed that is three times rated
(9000 RPM). The torque-optimal current locus can be seen running from the origin to the rating
point, and the higher speed operating locus follows the armature current limit. Figure 9 shows the
torque/speed and power/speed curves. Note that this sort of machine only approximates “constant
power” operation at speeds above the “base” or rating point speed.
PM Brushless Machine Current Loci
60
40
20
)A(
tnerruC
0
sixA-Q
-20
-40
-60
-80 -60 -40 -20 0 20
D-Axis Current (A)
Figure 8: Operating Current Loci of Example Machine
PM Brushless Machine
10
8
m-N
6
,euqroT
4
2
0
0 1000 2000 3000 4000 5000 6000 7000 8000 9000
4000
3000
sttaW
2000
,rewoP
1000
0
0 1000 2000 3000 4000 5000 6000 7000 8000 9000
Speed, RPM
Figure 9: Torque- and Power-Speed Capability
4 Parameter Estimation
We are now at the point of estimating the major parameters of the motors. Because we have a
number of different motor geometries to consider, but because they share parameters in not too
orderly a fashion, this section will have a number of sub-parts. First, we calculate flux linkage,
then reactance.
4.1 Flux Linkage
Given a machine which may be considered to be uniform in the axial direction, flux linked by a
single, full-pitched coil which spans an angle from zero to π/p, is:
π
p
φ = B Rldφ
r
0
 
where B is the radial flux through the coil. And, if B is sinusoidally distributed this will have
r r
a peak value of
2RlB
r
φ =
p
p
Now, if the actual winding has N turns, and using the pitch and breadth factors derived in
a
Appendix 1, the total flux linked is simply:
N
k
2RlB
1
a
w
λ = (30)
f
p
where
k = k k
w p b
α
k = sin
p
2
sinm γ
k = 2
b m sin γ
2
The angle α is the pitch angle,
N
p
α = 2πp
N
s
where N is the coil span (in slots) and N is the total number of slots in the stator. The angle γ
p s
is the slot electrical angle:
2πp
γ =
N
s
Now, what remains to be found is the space fundamental magnetic flux density B 1. In the
third appendix it is shown that, for magnets in a surface-mount geometry, the magnetic field at
the surface of the magnetic gap is:
B 1 = µ 0 M 1 k g (31)
where the space-fundamental magnetization is:
B 4 pθ
r m
M 1 = sin
µ 0 π 2
where B is remanent flux density of the permanent magnets and θ is the magnet angle.
r m
and where the factor that describes the geometry of the magnetic gap depends on the case. For
magnets inside and p = 1,
p−1
p R p+1 −R p+1 + p R 2p R 1−p −R 1−p
k = R s
g R 2p −R 2p p +1 2 1 p −1 i 1 2
s i 
For magnets inside and p = 1,
k = 1 1 R2 −R2 + R2 log R 2
g R s 2 −R i 2 2 2 1 i R 1 
For the case of magnets outside and p = 1:
p−1
k = R i
p R p+1 −R p+1 + p R2p R 1−p −R 1−p
g R 2p −R 2p p +1 2 1 p −1 s 1 2
s i 
and for magnets outside and p = 1,
k = 1 1 R2 −R2 + R2 log R 2
g R s 2 −R i 2 2 2 1 s R 1 
Where R s and R i are the outer and inner magnetic boundaries, respectively, and R 2 and R 1
are the outer and inner boundaries of the magnets.
Note thatforthe caseof a smallgap, inwhich both the physical gap g and themagnetthickness
h are both much less than rotor radius, it is straightforward to show that all of the above expres­
m
sions approach what one would calculate using a simple, one-dimensional model for the permanent
magnet:
h
m
k →
g
g + h
m
Thisisthewholestoryforthewinding-in-slot,narrowair-gap,surfacemagnetmachine. Forair­
gap armature windings, it is necessary to take into account the radial dependence of the magnetic
field.
4.2 Air-Gap Armature Windings
With no windings in slots, the conventional definition of winding factor becomes difficult to apply.
If,however,eachofthephasebeltsofthewinding occupiesanangularextent θ ,thentheequivalent
w
to (31) is:
sinp θw
k = 2
w p θw
2
Next, assume that the “density” of conductors within each of the phase belts of the armature
winding is uniform, so that the density of turns as a function of radius is:
2N r
a
N(r) =
R2 −R2
wo wi
This just expresses the fact that there is more azimuthal room at larger radii, so with uniform
density the number of turns as a function of radius is linearly dependent on radius. Here, R and
wo
R are the outer and inner radii, respectively, of the winding.
wi
Now it is possible to compute the flux linked due to a magnetic field distribution:
Rwo 2lN k r 2r
a w
λ f = p R2 −R2 µ 0 H r (r)dr (32)
 Rwi wo wi
Note the form of the magnetic field as a function of radius expressed in 80 and 81 of the second
appendix. For the “winding outside” case it is:
H = A rp−1 + R2pr −p−1
r s
 
Then a winding with all its turns concentrated at the outer radius r = R would link flux:
wo
2lR k 2lR k
λ c = w p o w µ 0 H r (R wo ) = w p o w µ 0 A R w p− o 1 + R s 2p R w − o p −1
 
Carrying out (32), it is possible, then, to express the flux linked by a thick winding to the flux that
would have been linked by a radially concentrated winding at its outer surface by:
λ
f
k =
t
λ
c
where, for the winding outside, p = 2 case:
2 1−x2+p ξ2p 1−x2−p
k = + (33)
t (1−x2)(1+ξ2p)
2+p
2−p
 
 
 
where we have used the definitions ξ = R /R and x = R /R . In the case of winding outside,
wo s wi wo
p = 2,
2 1−x4 ξ4
k = −logx (34)
t (1−x2)(1+ξ2p) 4 
In a very similar way, we can define a winding factor for a thick winding in which the reference
radius is at the inner surface. (Note: this is done because the inner surface of the inside winding
is likely to be coincident with the inner ferromagnetic surface, as the outer surface of the outer
winding ls likely to be coincident with the outer ferromagnetic surface). For p = 2:
2x −p 1−x2+p 1−x2−p
k = +(ηx) 2p (35)
t (1−x2)(1+η2p)
2+p 2−p
 
 
and for p = 2:
2x −2 1−x4
k = −(ηx) 4 logx (36)
t (1−x2)(1+η2p) 4 
where η = R /R
i wi
So, in summary, the flux linked by an air-gap armature is given by:
2RlB
N
k
k
1
a
w
t
λ = (37)
f
p
where B 1 is the flux density at the outer radius of the physical winding (for outside winding
machines) or at the inner radius of the physical winding (for inside winding machines). Note that
the additional factor k is a bit more than one (it approaches unity for thin windings), so that,
t
for small pole numbers and windings that are not too thick, it is almost correct and in any case
“conservative” to take it to be one.
4.3 Interior Magnet Motors:
For the flux concentrating machine, it is possible to estimate air-gap flux density using a simple
reluctance model.
The air- gap permeance of one pole piece is:
Rθ
p
℘ ag = µ 0 l
g
where θ is the angular width of the pole piece.
p
And the incremental permeance of a magnet is:
h l
m
℘ m = µ 0
w
m
The magnet sees a unit permeance consisting of its own permeance in series with one half of
each of two pole pieces (in series) :
℘ Rθ w
ag p m
℘ = =
u
℘ 4g h
m m
Magnetic flux density in the magnet is:
℘
u
B m = B 0
1+℘
u
And then flux density in the air gap is:
2h 2h w
m m m
B g = B m = B 0
Rθ 4gh + Rθ w
p m p m
The space fundamental of that can be written as:
4 pθ w
p m
B 1 = sin B 0 γ m
π 2 2g
where we have introduced the shorthand:
1
γ =
m 1+ wm θp R
g 4 hm
The flux linkage is then computed as before:
2RlB
N
k
1
a
w
λ = (38)
f
p
4.4 Winding Inductances
Thenextimportantset ofparameterstocomputearethed-andq-axisinductancesof themachine.
We will consider three separate cases, the winding-in-slot, surface magnet case, which is magnet­
ically “round”, or non-salient, the air-gap winding case, and the flux concentrating case which is
salient, or has different direct- and quadrature- axis inductances.
4.4.1 Surface Magnets, Windings in Slots
In this configuration there is no saliency, so that L = L . There are two principal parts to
d q
inductance, the air-gap inductance and slot leakage inductance. Other components, including end
turn leakage, may be important in some configurations, and they would be computed in the same
way asforaninductionmachine. Asisshowninthe firstAppendix,thefundamentalpart of air-gap
inductance is:
L d1 = 2 q π 4 µ p 0 2 N (g a 2 + k w 2 h lR ) s (39)
w
Here, g is the magnetic gap, including the physical rotational gap and any magnet retaining means
that might be used. h is the magnet thickness.
m
Since the magnet thickness is included in the air-gap, the air-gap permeance may not be very
large, so that slot leakage inductance may be important. To estimate this, assume that the slot
shape is rectangular, characterized by the following dimensions:
h height of the main portion of the slot
s
w width of the top of the main portion of the slot
s
h height of the slot depression
d
w slot depression opening
d
Of course not all slots are rectangular: in fact in most machines the slots are trapezoidal in
shape to maintain teeth cross-sections that are radially uniform. However, only a very small error
(a few percent) is incurred in calculating slot permeance if the slot is assumed to be rectangular
and the top width is used (that is the width closest to the air-gap). Then the slot permeance is,
per unit length:
1 h h
s d
P = µ 0 +
3w w
 s d 
Assume for the rest of this discussion a standard winding, with m slots in each phase belt
(this assumes, then, that the total number of slots is N = 2pqm), and each slot holds two half-
s
coils. (A half-coil is one side of a coil which, of course, is wound in two slots). If each coil
has N turns (meaning N = 2pmN ) , then the contribution to phase self-inductance of one
c a c
slot is, if both half-coils are from the same phase, 4lPN2 . If the half-coils are from different
c
phases, then the contribution to self inductance is lPN2 and the magnitude of the contribution to
c
mutual inductance is lPN2 . (Some caution is required here. For three phase windings the mutual
c
inductance is negative, so are the senses of the currents in the two other phases, so the impact of
“mutual leakage” is to increase the reactance. This will be true for other numbers of phases as
well, even if the algebraic sign of the mutual leakage inductance is positive, in which case so will
be the sense of the other- phase current.)
We will make two other assumptions here. The standard one is that the winding “coil throw”,
or span between sides of a coil, is Ns −N . N is the coil “short pitch”. The other is that each
2p sp sp
phase belt will overlap with, at most two other phases: the ones on either side in sequence. This
last assumption is immediately true for three- phase windings (because there are only two other
phases. It is also likely to be true for any reasonable number of phases.
Noting that each phase occupies 2p(m −N ) slots with both coil halves in the same slot and
sp
4pN slots in which one coil half shares a slot with a different phase, we can write down the two
sp
components of slot leakage inductance, self- and mutual:
L = 2pl (m −N )(2N ) 2 +2N N2
as sp c sp c
L = 2plN N2 
am sp c
For a three- phase machine, then, the total slot leakage inductance is:
L = L + L = 2plPN2 (4m −N )
a as am c sp
For a uniform, symmetric winding with an odd number of phases, it is possible to show that the
effective slot leakage inductance is:
2π
L = L −2L cos
a as am
q
Total synchronous inductance is the sum of air-gap and leakage components: so far this is:
L d = L d1 + L a
4.4.2 Air-Gap Armature Windings
It is shown in Appendix 2 that the inductance of a single-phase of an air-gap winding is:
L = L
a np
n
 
where the harmonic components are:
L = 8 µ 0 lk w 2 n N a 2 1−x2−kγ2k 1−x2+k
k πk(1−x2)2 ⎡ (4−k2)( 1 −γ2k) 
⎣
2
2
ξ −2k 1−x2−k
ξ2k 1−x
k+2
+ +
(2+ k) 2 (1−γ 2k) (2−k ) 2 (γ−2k − 1)
−2kx2+k 1−x2−k
1−γ
k 1−x2
+ −
 (4−k2)(γ − 2k −1) 4−k2 2 ⎤
⎦
where we have used the following shorthand coefficients:
R
wi
x =
R
wo
R
i
γ =
R
s
R
wo
ξ =
R
s
This fits into the conventional inductance framework:
L = 4 µ 0 N a 2 R s Lk w 2 n k
n π N2p2g a
if we assign the “thick armature” coefficient to be:
1−x2−kγ2k 1−x2+k
2gk 1
k =
a R
(1−x2) 2 ⎡ (4−k2)( 1 −γ2k) 
wo
2
2
⎣
ξ −2k 1−x2−k
ξ2k 1−xk
+2
+ +
(2+ k) 2 (1−γ 2k) (2−k ) 2 (γ−2k − 1)
−2kx2+k 1−x2−k
1−γ
k 1−x2
+ −
 (4−k2)(γ − 2k −1) 4−k2 2 ⎤
⎦
and k = np and g = R −R is the conventionally defined “air gap”. If the aspect ratio R /R is
s i i s
not too far from unity, neither is k . In the case of p = 2, the fundamental component of k is:
a a
2gk 1 1−x4 2γ4 + x4 1−γ4 γ4 ξ4 1−x4 2
2
k = − logx + (logx)
+
a R wo (1−x2) 2 8 4(1− γ4) ξ4 (1−γ4) 16 (1−γ4 ) 
For a q-phase winding, a good approximation to the inductance is given by just the first space
harmonic term, or:
L = q 4 µ 0 N a 2 R s Lk w 2 n k
d 2π n2p2g a
4.4.3 Internal Magnet Motor
The permanent magnets will have an effect on reactance because the magnets are in the main flux
path of the armature. Further, they affect direct and quadrature reactances differently, so that the
machine will be salient. Actually, the effect on the direct axis will likely be greater, so that this
type of machine will exhibit “negative” saliency: the quadrature axis reactance will be larger than
the direct- axis reactance.
A full- pitch coil aligned with the direct axis of the machine would produce flux density:
µ N I
0 a
B =
r
2g 1+ Rθp wm
4g hm
 
Note that only the pole area is carrying useful flux, so that the space fundamental of radial flux
density is:
p
θ 2 m
si n
B 1 = µ 0
N
a I
4
R θp
g
π
w
2
m
1+
hm 4g
Then, since the flux linked by the winding is:
k
B
2RlN
1
a
w
λ =
a
p
The d- axis inductance, including mutual phase coupling, is (for a q- phase machine):
L = q 4 µ 0 N a 2 Rlk w 2 γ sin pθ p
d 2π p2g m 2
The quadrature axis is quite different. On that axis, the armature does not tend to push flux
through the magnets, so they have only a minor effect. What effect they do have is due to the fact
that the magnets produce a space in the active air- gap. Thus, while a full- pitch coil aligned with
the quadrature axis will produce an air- gap flux density:
µ NI
0
B =
r
g
the space fundamental of that will be:
µ 0 NI 4 pθ t
B 1 = 1−sin
g π 2
 
where θ is the angular width taken out of the pole by the magnets.
t
So that the expression for quadrature axis inductance is:
L = q 4 µ 0 N a 2 Rlk w 2 1−sin pθ t
q 2π p2g 2
 
5 Current Rating and Resistance
The last part of machine rating is its current capability. This is heavily influenced by cooling meth­
ods, for the principal limit on current is the heating produced by resistive dissipation. Generally,
it is possible to do first-order design estimates by assuming a current density that can be handled
by a particular cooling scheme. Then, in an air-gap winding:
θ
N I = R2 −R2 we J
a a wo wi
a
2
 
and note that, usually, the armature fills the azimuthal space in the machine:
2qθ = 2π
we
For a winding in slots, nearly the same thing is true: if the rectangular slot model holds true:
2qN I = N h w J
a a s s s s
where we are using J to note slot current density. Now, suppose we can characterize the total slot
s
area by a “space factor” λ which is the ratio between total slot area and the annulus occupied by
s
the slots: for the rectangular slot model:
N h w
s s s
λ =
s π R2 −R2
wo wi
where R = R+h and R = R +h inano rmal,stator outsidewinding. Inthiscase,J = J λ
wi d wo wi s a s s
and the two types of machines can be evaluated in the same way.
It would seem apparent that one would want to make λ as large as possible, to permit high
s
currents. The limit on thisisthat themagneticteethbetweenthe conductorsmustbe ableto carry
the air-gap flux, and making them too narrow would cause them to saturate. The peak of the time
fundamental magnetic field in the teeth is, for example,
2πR
B t = B 1
N w
s t
where w is the width of a stator tooth:
t
2π(R + h )
d
w = −w
t s
N
s
so that
B
1
B ≈
t
1−λ
s
5.1 Resistance
Winding resistance may be estimated as the length of the stator conductor divided by its area and
its conductivity. The length of the stator conductor is:
l = 2lN f
c a e
where the “end winding factor” f is used to take into account the extra length of the end turns
e
(which is usually not negligible). The area of each turn of wire is, for an air-gap winding :
θ R2 −R2
A = we wo wi λ
w w
2 N
a
where λ , the “packing factor” relates the area of conductor to the total area of the winding. The
w
resistance is then just:
4lN2
R = a
a θ R2 −R2 λ σ
we wo wi w
and, of course, σ is the conductivity of the co nductor. 
For windings in slots the expression is almost the same, simply substituting the total slot area:
2qlN2
R = a
a
N h w λ σ
s s s w
The end turn allowance depends strongly on how the machine is made. One way of estimating
what it might be is to assume that the end turns follow a roughly circular path from one side of
the machine to the other. The radius of this circle would be, very roughly, R /p, where R is the
w w
average radius of the winding: R ≈ (R + R )/2
w wo wi
Then the end-turn allowance would be:
πR
w
f =1+
e
pl
Outer Magnetic
Rs
Boundary
θ
R2
Ri
r
Winding R1
Inner Magnetic
Boundary
Figure 10: Coordinate System for Inductance Calculation
6 Appendix 1: Air-Gap Winding Inductance
In this appendix we use a simple two-dimensional model to estimate the magnetic fields and then
inductances of an air-gap winding. The principal limiting assumption here is that the winding is
uniforminthezˆ direction, which means itis long in comparisonwith its radii. This isgenerally not
true, nevertheless the answers we will get are not too far from being correct. The style of analysis
used here can be carried into a three-dimensional, or quasi-three dimensional domain to get much
more precise answers, at the expense of a very substantial increase in complexity.
The coordinate system to be used is shown in Figure 10. To maintain generality we have four
radii: R and R are ferromagnetic boundaries, and would of course correspond with the machine
i s
shaft and the stator core. The winding itself is carried between radii R 1 and R 2, which correspond
with radii R and R in the body of the text. It is assumed that the armature is carrying a
wi wo
current in the z- direction, and that this current is uniformin the radialdimensionof the armature.
If a single phase of the armature is carrying current, that current will be:
N I
a a
J z0 =
θwe R2 −R2
2 2 1
over the annular wedge occupied by the phase. T he resulti ng distribution can be fourier analyzed,
and the n-th harmonic component of this will be (assuming the coordinate system has been chosen
appropriately):
4 θ 4 N I
we a a
J zn = nπ J z0 sinn 2 = πR2 −R2 k wn
2 1
where the n-th harmonic winding factor is:
sinn θwe
k = 2
wn n θwe
2
and note that θ is the electrical winding angle:
we
θ = pθ
we w
Now, it is easiest to approach this problem using a vector potential. Since the divergence of
flux density is zero, it is possible to let the magnetic flux density be represented by the curl of a
vector potential:
B = ×A
Taking the curl of that:
 × ×A = µ 0 J = · A − 2A
 
and using the coulomb gage
 · A = 0
we have a reasonable tractable partial differential equation in the vector potential:
 2A = −µ 0 J
Now, since in our assumption there is only a z- directed component of J, we can use that one
component, and in circular cylindrical coordinates that is:
1 ∂ ∂A 1 ∂2
z
r∂r r ∂r + r2 ∂θ2 A z = −µ 0 J z
For this problem, all variables will be varying sinusoidally with angle, so we will assume that
angular dependence ejkθ. Thus:
1 ∂ ∂A k2
z
r∂r r ∂r − r2 A z = −µ 0 J z (40)
This is a three-region problem. Note the regions as:
i R i < r < R 1
w R 1 < r < R 2
o R 2 < r < R s
For i and o, the current density is zero and an appropriate solution to (40) is:
A z = A + r k +A−r −k
In the region of the winding, w, a particular solution must be used in addition to the homoge­
neous solution, and
A z = A + r k + A−r −k + A p
where, for k = 2,
µ J r2
0 z
A = −
p 4−k2
or, if k = 2,
µ 0 J z r2 1
A = − logr −
p
4 4
 
And, of course, the two pertinent components of the magnetic flux density are:
1∂A
z
B =
r
r ∂θ
∂A
z
B = −
θ
∂r
Next, it is necessary to match boundary conditions. There are six free variables and corre­
spondingly there must be six of these boundary conditions. They are the following:
• At the inner and outer magnetic boundaries, r = R and r = R , the azimuthal magnetic
i s
field must vanish.
• At the inner and outer radii of the winding itself, r = R 1 and r = R 2, both radial and
azimuthal magnetic field must be continuous.
These conditions may be summarized by:
kA + i R i k −1 −kAi − R i − k−1 = 0
kAo + R s k −1 −kA − o R s − k−1 = 0
µ J R
A + w R 2 k −1 + A − w R 2 − k−1 − 4 0 − z k2 2 = A + o R 2 k −1 + Ao − R 2 − k−1
2µ
J
R
4 0 −
2 2 = −kA + o R 2 k −1 + kA − o R 2 − k−1
−kAw + R 2 k −1 + kAw − R 2 − k−1 +
z k
µ J R
Aw + R 1 k −1 +Aw − R 1 − k−1 − 4 0 − z k2 1 = A + i R 1 k −1 + A − i R 1 − k−1
2µ
J
R
2 1 = −kA + i R 1 k −1 + kAi − R 1 − k−1
4 0 −
−kA + w R 1 k −1 + kA − w R 1 − k−1 +
z k
Note that we are carrying this out here only for the case of k = 2. The k = 2 case may be obtained
by substituting its particular solution in at the beginning or by using L’Hopital’s rule on the final
solution. This set may be solved (it is a bit tedious but quite straightforward) to yield, for the
winding region:
2 −k −R
2−k
2+k −R
2 +k
2 kR
2 kR
R
R
µ
J
0
z
2
1
1
2
s
r k
i
A =
+
z 2k (2−k) R s 2 k −R i 2 k (2+k) R s 2 k −R i 2 k 
R 2−k − R 2−k R −2kR 2+ k −R −2kR 2 +k 2k
+ 2 1 + s 2 i 1 r −k − r 2
⎛(2−k) R −2k −R −2k (2+k) R −2k −R −2k ⎞ 4−k2 ⎤
i s i s
⎝ ⎠ ⎦
Now, the inductance linked by any single, full-pitched loop of wire located with one side at
azimuthal position θ and radius r is:
λ = 2lA (r,θ)
i z
To extend this to the whole winding, we integrate over the area of the winding the incremental flux
linked by each element times the turns density. This is, for the n-th harmonic of flux linked:
R2
4lk
N
wn
a
λ = A (r)rdr
n R2−R2 z
2 1 R1
Making the appropriate substitutions for current into the expression for vector potential, this
becomes:
2 2 −
−k +
1 2
2 2+
1 2 +
R 2 k+
2 −
1 k+2
w 2
a 2
s 2 k
i 2 k
k
k
k
lk
n N
I a
µ 0
R
R
R
R
R
R
R
8
−
−
λ
=
n
2 
i 2
i 2 k 
2 2 k
s 2 k
k
2 2
1 2
π
k
k
k
R
R
R
R
+
2
(2+
)
(2
−
)
−
−
k
R
R
−
 R 2− k −R 2−k R −2kR 2 +k −R −2kR 2+k R 2−k −R 2−k 2k R4−R4
+ 2 1 + s 2 i 1 2 1 − 2 1
⎛(2−k) R −2k −R −2k (2+k) R −2k −R −2k ⎞ 2−k 4−k2 4 ⎤
i s i s
⎝ ⎠ ⎦
7 Appendix 2: Permanent Magnet Field Analysis
This section is a a field analysis of the kind of radially magnetized, permanent magnet structures
commonly used in electric machinery. It is a fairly general analysis, which will be suitable for use
with either surface or in-slot windings, and for the magnet inside or the magnet outside case.
This is a two-dimensional layout suitable for situations in which field variation along the length
of the structure is negligible.
8 Layout
The assumed geometry is shown in Figure 11. Assumed iron (highly permeable) boundaries are
at radii R and R . The permanent magnets, assumed to be polarized radially and alternately
i s
(i.e. North-South ...), are located between radii R 1 and R 2. We assume there are p pole pairs (2p
magnets) and that each magnet subsumes an electrical angle of θ . The electrical angle is just p
me
timesthe physical angle, so that if the magnet angle were θ = π, the magnets would be touching.
me
If the magnets are arranged so that the radially polarized magnets are located around the
azimuthal origin (θ = 0), the space fundamental of magnetization is:
M = i r M 0 cospθ (41)
where the fundamental magnitude is:
Brem
4 θ
me
M 0 = sin (42)
π 2 µ 0
and Brem is the remanent magnetization of the permanent magnet.
Since there is no current anywhere in this problem, it is convenient to treat magnetic field as
the gradient of a scalar potential:
H = − ψ (43)
The divergence of this is:
 2ψ = − · H (44)
Since magnetic flux density is divergence-free,
 · B = 0 (45)
we have:
R
s
R
2
R
R 1
i
Figure 11: Axial View of Magnetic Field Problem
 · H = − · M (46)
or:
1
 2ψ = · M = M 0 cospθ (47)
r
Now, if we let the magnetic scalar potential be the sum of particular and homogeneous parts:
ψ = ψ + ψ (48)
p h
where 2ψ = 0, then:
h
1
 2ψ p = M 0 cospθ (49)
r
We can find a suitable solution to the particular part of this in the region of magnetization by
trying:
ψ = Crγ cospθ (50)
p
Carrying out the Laplacian on this:
1
 2ψ p = Crγ−2 γ2 −p2 cospθ = M 0 cospθ (51)
r
 
which works if γ = 1, in which case:
M r
0
ψ = cospθ (52)
p 1−p2
Of course this solution holds only for the region of the magnets: R 1 < r < R 2, and is zero for the
regions outside of the magnets.
A suitable homogeneous solutionsatisfies Laplace’s equation, 2ψ = 0, and is in general of the
h
form:
ψ = Arp cospθ + Br −p cospθ (53)
h
Then we may write a trial total solution for the flux density as:
R i < r < R 1 ψ = A 1 rp + B 1 r −p cospθ (54)
M r
R 1 < r < R 2 ψ = A 2 rp + B 2 r −p + 1− 0 p2 cospθ (55)
 
R 2 < r < R s ψ = A 3 rp + B 3 r −p cospθ (56)
The boundary conditions at the inner a nd outer (assum ed infinitely permeable) boundaries at
r = R and r = R require that the azimuthal field vanish, or ∂ψ = 0, leading to:
i s ∂θ
2p
B 1 = −R i A 1 (57)
B 3 = −R s 2 pA 3 (58)
At the magnet inner and outer radii, H and B must be continuous. These are:
θ r
1∂ψ
H = − (59)
θ
r ∂θ
∂ψ
B r = µ 0 − + M r (60)
∂r
 
These become, at r = R 1:
M
p −1
− p−1
p −1
− p−1
0
2 p
−pA 1 R 1
−p 1
= −p A 2 R 1
+ B 2 R 1
−R i
R 1
p 2 (61)
−
 
M
p −1
− p−1
p −1
− p−1
0
2 p
−pA 1 R 1
+ R i
R 1
= −p A 2 R 1
−B 2 R 1
p 2 + M 0 (62)
− 1
−
 
and at r = R 2:
−pA 3 R 2 p −1 −R s 2 p R 2 − p−1 = −p A 2 R 2 p −1 + B 2 R 2 − p−1 −p 1 M − 0 p2 (63)
 
−pA 3 R 2 p −1 + R s 2 p R 2 − p−1 = −p A 2 R 2 p−1 −B 2 R 2 − p−1 − 1 M − 0 p2 + M 0 (64)
 
Some small-time manipulation of these yields:
M
− p
− p
0
2 p
p
p
A 1 R 1
−R i
R 1
= A 2 R 1
+ B 2 R 1
+ R 1 1
p 2 (65)
−
 
M
− p
− p
0
2 p
p
p
A 1 R 1
+ R i
R 1
= A 2 R 1
−B 2 R 1
+ pR 1 1
p 2 (66)
−
 
A 3 R 2 p −R s 2pR 2 − p = A 2 R 2 p + B 2 R 2 − p + R 2 1 M − 0 p2 (67)
 
A 3 R 2 p + R s 2pR 2 − p = A 2 R 2 p −B 2 R 2 − p + pR 2 1 M − 0 p2 (68)
 
Taking sums and differences of the first and second and then third and fourth of these we obtain:
1+p
p
p
2A 1 R 1
= 2A 2 R 1
+ R 1 M 0 1−p2 (69)
p
−
1
− p
− p
2p
2A 1 R i
R 1
= −2B 2 R 1
+ R 1 M 0 1
2 (70)
p
−
1+p
p
p
2A 3 R 2
= 2A 2 R 2
+ R 2 M 0 1−p2 (71)
2A 3 R s 2 pR 2 −p = −2B 2 R 2 − p + R 2 M 0 1 p − − p 1 2 (72)
p
p
and then multiplying through by appropriate factors (R
and R
and then taking sums and differ­
2 1
ences of these,
p
M
+
1
0
p
p
p
p
(A 1 −A 3)R 1
R 2
= (R 1 R 2
−R 2 R 1
)
2 (73)
p
2
1
−
A 1 R i 2 p −A 3 R s 2p R 1 − p R 2 − p = R 1 R 2 − p −R 2 R 1 − p M 2 0 1 p − − p 1 2 (74)
 
Dividing through by the appropriate groups:
p
p
A 1 −A 3 = R 1 R R 2
p − R R p 2 R 1
M 2 0 1 1 − + p p 2 (75)
1 2
−p
− p
M 2 0 1 p − − p 1 2 (76)
A 1 R i 2 p −A 3 R s 2p = R 1 R R 2
− p − R R − 2 p R 1
1 2
and then, by multiplying the top equation by R2p and subtracting:
s
− p
− p
p
p
= R 1 R R 2
M 2 0 1 p − − p 1 2 (77)
M 2 0 1 1 − + p p 2 R s 2 p − R 1 R R 2
1 −p − R R 2 − p 2 R 1
1 p − R R 2 p 2 R 1
R s 2 p −R i 2 p
A 1
 
 
This is readily solved for the field coefficients A 1 and A 3:
A 1 = − 2 R 2p M − 0 R 2p p p 2 + − 1 1 R 1 1−p −R 2 1 −p R s 2 p + p p 2 − − 1 1 R 2 1+p −R 1 1 +p (78)
s i 
 
 
M
1
1
1 −p
1 −p
0
2 p
1 +p
1 +p
A 3 = − 2
−R 2
R i
p R 2
−R 1
p R 1
− 1+
(79)
R 2p
R 2p
1−
−
s i 
 
Now, noting that the scalar potential is, in region 1 (radii less than the magnet),
ψ = A 1(rp −R i 2 p r −p)cospθ r < R 1
ψ = A 3(rp −R s 2 pr −p)cospθ r > R 2
and noting that p(p +1)/(p2 −1) = p/(p −1) and p(p −1)/(p2 −1) = p/(p +1), magnetic field is:
r < R 1 (80)
H = M 0 p R 1−p −R 1−p R2p + p R 1+p −R 1+p rp−1 + R 2p r −p−1 cospθ
r 2 R 2p −R 2p p −1 1 2 s p +1 2 1 i
s i 
r > R 2 (81)
H = M 0 p R 1−p −R 1−p R 2p + p R 1+p −R 1+p rp−1 + R2pr −p−1 cospθ
r 2 R 2p −R 2p p −1 1 2 i p +1 2 1 s
s i 
 
The case of p = 1 appears to be a bit troublesome here, but is easily handled by noting that:
p
R 2
1−p
1−p
R
−R
lim
= log
p→1 p −1 1 2 R 1
 
Now: there are a number of special cases to consider.
For the iron-free case, R i → 0 and R 2 → ∞, this becomes, simply, for r <R 1:
M 0 p
1−p rp−1
1−p
−R
cospθ (82)
R
H =
r 2 p −1 1 2
 
Note that for the case of p = 1, the limit of this is
M R
0 2
H = log cosθ
r
2 R 1
and for r > R 2:
M p
0
−(p+1)
p+1
p+1
H =
−R
r
cospθ
R
r 2 p +1 2 1
 
For the case of a machine with iron boundaries and windings in slots, we are interested in the
fields at the boundaries. In such a case, usually, either R i = R 1 or R s = R 2. The fields are:
at the outer boundary: r = R :
s
H r = M 0 R 2 R p − s p− R 1 2p p + p 1 R 2 p+1 −R 1 p +1 + p − p 1 R i 2 p R 1 1−p −R 2 1 −p cospθ
s i 
or at the inner boundary: r = R :
i
p−
1
H r = M 0 R 2 R p − i
2p p + p 1 R 2 p+1 −R 1 p +1 + p − p 1 R s 2 p R 1 1 −p −R 2 1 −p cospθ
R
s i 
MIT OpenCourseWare
http://ocw.mit.edu
6.061 / 6.690 Introduction to Electric Power Systems
Spring 2011
For information about citing these materials or our Terms of Use, visit: http://ocw.mit.edu/terms.
