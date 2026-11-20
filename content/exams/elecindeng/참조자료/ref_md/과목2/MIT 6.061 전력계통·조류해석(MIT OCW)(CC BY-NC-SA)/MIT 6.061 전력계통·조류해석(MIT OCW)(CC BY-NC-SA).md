# MIT 6.061 전력계통·조류해석(MIT OCW)(CC BY-NC-SA)

> 원문: MIT OpenCourseWare — https://ocw.mit.edu · CC BY-NC-SA 4.0 · © Massachusetts Institute of Technology


Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes
Chapter 1: Review of Network Theory∗
J.L. Kirtley Jr.
1 Introduction
This note is a review of some of the most salient points of electric network theory. In it we do not
prove any of the assertions that are made. We deal only with passive, linear network elements.
2 Network Primitives
Electric network theory deals with two primitive quantities, which we will refer to as:
1. Potential (or voltage), and
2. Current.
Current is the actual flow of charged carriers, while difference in potential is the force that
causes that flow. As we will see, potential is a single- valued function that may be uniquely defined
overthe nodes of anetwork. Current, ontheotherhand, flowsthrough the branches of thenetwork.
Figure 1 shows the basic notion of a branch, in which a voltage is defined across the branch and a
current is defined to flow through the branch. A network is a collectionof such elements, connected
together by wires.
+ v −
i
Figure 1: Basic Circuit Element
Network topology is the interconnection of its elements. That, plus the constraints on voltage
and current imposed by the elements themselves, determines the performance of the network,
described by the distribution of voltages and currents throughout the network.
Two important concepts must be described initially. These are of “loop” and “node”.
∗ c2007 James L. Kirtley Jr.
1. A loop in the network is any closed path through two or more elements of the network. Any
non-trivial network will have at least one such loop.
v
+ −
i 2
2
i
3
−
+
v
1 v
3
+
−
i
1
Figure 2: This is a loop
2. a node is a point at which two or more elements are interconnected.
i1 + v1 − − v2 + i2
−
v3
+
i3
Figure 3: This is a node
The two fundamental laws of network theory are known as Kirchoff’s Voltage Law (KVL), and
Kirchoff’s Current Law (KCL).Theselaws describethe topologyof thenetwork, and arisedirectly
from the fundmantal laws of electromagnetics. They are simply stated as:
• Kirchoff’s Voltage Law states that, around any loop of a network, the sum of all voltages,
taken in the same direction, is zero:
v = 0 (1)
k
loop
 
• Kirchoff’s Current Law states that, at any node of a network, the sum of all currents entering
the node is zero:
i = 0 (2)
k
node
 
1Note that KVL is a discrete version of Faraday’s Law, valid to the extent that no time-varying
flux links the loop. KCL is just conservation of current, allowing for no accumulation of charge at
the node.
Network elements affect voltages and currents in one of three ways:
1. Voltage sources constrain the potential difference across their terminals to be of some fixed
value (the value of the source).
2. Current sources constrain the current through the branch to be of some fixed value.
3. Allotherelementsimposesomesort of relationship,eitherlinearornonlinear,betweenvoltage
across and current through the branch.
+
v
i
−
Voltage Current
Source Source
Figure 4: Notation for voltage and current sources
Voltage and current sources can be either independent or dependent. Independent sources have
values which are, as the name implies, independent of other variables in a circuit. Dependent
sources have values which depend on some other variable in a circuit. A common example of a
dependent source is the equivalent current source used for modeling the collector junction in a
transistor. Typically, this is modeled as a current dependent current source, in which collector
current is taken to be directly dependent on emitter current. Such dependent sources must be
handled with some care, for certain tricks we will be discussing below do not work with them.
Forthepresenttime,wewillconsider,inadditiontovoltageand current sources,only impedance
elements, which impose a linear relationship between voltage and current. The most common of
these is the resistance, which imposes the relationship which is often referred to as Ohm’s law:
v = Ri (3)
r r
i
r
+
R v
r
−
Figure 5: Resistance Circuit Element
A bit later on in this note, we will extend this notion of impedance to other elements, but for
the moment the resistance will serve our purposes.
3 Examples: Voltage and Current Dividers
Figure 6 may be used as an example to show how we use all of this. See that it has one loop and
three nodes. Around the loop, KVL is:
V s −v 1 −v 2 = 0
At the upper right- hand node, we have, by KCL:
i 1 −i 2 = 0
The constitutive relations imposed by the resistances are:
v 1 = R 1 i 1
v 2 = R 2 i 2
Combining these, we find that:
V s = (R 1 + R 2)i 1
We may solve for the voltage across, say, R 2, to obtain the so-called voltage divider relationship:
R
2
v 2 = V s (4)
R 1 + R 2
i
1
v
1
+ −
+
+
R v
v 1 R 2
2
s
−
i
− 2
Figure 6: Voltage Divider
A second example is illustrated by Figure 7. Here, KCL at the top node yields:
I s −i 1 −i 2 = 0
And KVL, written around the loop that has the two resistances, is:
R 1 i 1 −R 2 i 2 = 0
Combining these together, we have the current divider relationship:
R
1
i 2 = I s (5)
R 1 + R 2
Once we have derived the voltage and current divider relationships, we can use them as part of
our “intellectual toolkit”, because they will always be true.
i i
1 2
+ +
R v R v
I 1 1 2 2
s
− −
Figure 7: Current Divider
4 Node Voltages and Reference
One of the consequences of KVL is that every node in a network will have a potential which is
uniquely specified with respecttosomeothernode. Thus, if wetakeoneof thenodesinthenetwork
tobeareference, or datum, each of theothernodeswillhaveauniquepotential. Thevoltageacross
any network branch is then the difference between the potentials at the nodes to which the element
is connected. The potential of a node is the sum of voltages encountered when traversing some
path between that node and the datum node. Note that any path will do. If KVL is satisfied, all
paths between each pair of nodes will yield the same potential.
A commonly used electric circuit is the Wheatstone Bridge, shown in its simplest form in
Figure 8. The output voltage is found simply from the input voltage as just the difference between
two voltage dividers:
R R
2 4
v = v −
o s
R 1 + R 2 R 3 + R 4
 
 
This circuit is used in situations in which one or more resistors varies with, say temperature or
mechanical strain. The bridge can be balanced so that the output voltage is zero by adjusting one
of theotherresistors. Thenrelativelysmall variationsinthesensing element canresultinrelatively
big differences in the output voltage. If, for example R 2 is the sensing element, R 4 can be adjusted
to balance the bridge.
5 Serial and Parallel Combinations
There are a number of techniques for handling network problems, and we will not be able to
investigate each of them in depth. We will, however, look into a few techniques for analysis which
involve progressive simplificationof the network. To start, we considerhow one might handle series
and parallel combinations of elements. A pair of elements is in series if the same current flows
through both of them. If these elements are resistors and if the detail of voltage division between
themisnot required,itispossibletolump thetwotogetherasasingleresistance. Thisisillustrated
in Figure 9. The voltage across the current source is:
v s = v 1 + v 2 = i s R 1 + i s R 2 = i s (R 1 + R 2)
The equivalent resistance for the series combination is then:
R series = R 1 + R 2 (6)
+ +
R v R v
1 1 3 3
+ − −
v
v
s o
− + +
R v R v
2 3 4 4
− −
Figure 8: Wheatstone Bridge
v
1
+ −
+ +
i R v
s v 1 R 2
s 2
−
− i
2
Figure 9: Series Resistance Combination
Similarly, resistance elements connected in parallel can be lumped if it is not necessary to know
the details of division of current between them. Figure 10 shows this combination.
Here, current i is simply:
v v 1 1
i = + = v +
R R R R
1 2
1 2
 
 
The equivalent resistance for the parallel combination is then:
1 R 1 R 2
R = = (7)
par
1
1
R 1 + R 2
+
R
R
1
2
Because of the importance of parallel connection of resistances(and of other impedances), a special
symbolic form is used for parallel construction. This is:
R R
1 2
R 1||R 2 = (8)
R 1 + R 2
As an example, consider the circuit shown in Figure 11, part (a). Here, we have four, resistors
arranged in an odd way to form a two- terminal network. To find the equivalent resistance of this
thing, we can do a series of series-parallel combinations.
The two resistors on the right can be combined as a series combination to form a single, two
ohm resistor as shown in part (b). Then the equivalent resistor, which is in parallel with one of the
I
i i
+ 1 2
+ +
v R v R v
1 1 2 2
− −
−
Figure 10: Parallel Resistance Combination
2 1
2 2
3
2 1 2 2 1
Series
Parrallel
(a) Series (b) (c) Comb (d)
Comb
Comb
Figure 11: Series-Parallel Reduction
two ohm resistors can be combined to form a single combination part(c). That is in series with the
remaining resistor, leaving us with an equivalent input resistance of R = 3Ω.
6 Loop and Node Equations
There are two well- developed formal ways of solving for the potentials and currents in networks,
often referred to as loop and node equation methods. They are closely related, using KCL and
KVL together with element constraints to build sets of equations which may then be solved for
potentials and currents.
• In the node equation method, KCL is written at each node of the network, with currents
expressed in terms of the node potentials. KVL is satisfied because the node potentials are
unique.
• Intheloop equation method,KVLiswrittenabout acollectionof closedpathsinthenetwork.
“Loop currents” are defined, and made to satisfy KCL, and the branch voltages are expressed
in terms of them.
The two methods are equivalent and a choice between them is usually a matter of personal prefer­
ence. The node equation method is probably more widely used, and lends itself well to computer
analysis.
To illustrate how these methods work, consider the network of Figure 12.
This network has three nodes. We are going to write KCL for each of the nodes, but note that
only two explicit equations are required. If KCL is satisfied at two of the nodes, it is automatically
satisfied at the third. Usually the datum node is the one for which we do not write the expression.
i R
1 2
+
+
V I v
R R
1 2
3
−
−
Figure 12: Sample Network
KCL written for the two upper nodes of the network is:
V V −v
2
−i 1 + + = 0 (9)
R R
1 2
v
−V v
2
2
−I + + = 0 (10)
R R
2 3
These two expressions are easily solved for the two unknowns, i 1 and v 2:
R R R
3 2 3
v 2 = V + I
R 2 + R 3 R 2 + R 3
R 1 + R 2 + R 3 R 3
i 1 = V − I
R 1(R 2 + R 3) R 2 + R 3
i R
1 2
+
+
V I v
R R
1 2
i i 3
− a b
−
Figure 13: Sample Network Showing Loops
The loop equation method is similar. We need the same number of independent expressions
(two), so we need to take two independent loops. For this, take as the loops as is shown in
Figure 13:
1. The loop that includes the voltage source and R 1.
2. The loop that includes R 1, R 2, and R 3.
It isalso necessary to define loop currents, which we willdenote as i and i . These are the currents
a b
circulating around the two loops. Note that where the loops intersect, the actual branch current
will be the sum of or difference between loop currents. For this example, assume the loop currents
are defined to be circulating counter-clockwise in the two loops. The two loop equations are:
V + R 1(i
−i
) = 0 (11)
a
b
R 1(i b −i a )+R 2 i b + R 3(i b −I) = 0 (12)
These are equally easily solved for the two unknowns, in this case the two loop currents i and i .
a b
7 Linearity and Superposition
An extraordinarily powerful notion of network theory is linearity. This property has two essential
elements, stated as follows:
1. For any single input x yielding output y, the response to an input kx is ky for any value of k.
2. If, in a multi-input network the input x 1 by itself yields output y 1 and a second input x 2 by
itself yields y 2, then the combination of inputs x 1 and x 2 yields the output y = y 1 + y 2.
This is important to us at the present moment for two reasons:
1. It tells us that the solution to certain problems involving networks with multiple inputs is
actually easier than we might expect: if a network is linear, we may solve for the output with
each separate input, then add the outputs. This is called superposition.
2. It also tells us that, for networks that are linear, it is not necessary to actually consider the
value of the inputs in calculating response. What is important is a system function, or a ratio
of output to input.
Superposition is an important principle when dealing with linear networks, and can be used
to make analysis easier. If a network has multiple independent sources, it is possible to find the
response to each source separately, then add up all of the responses to find total response. Note
that this can only be done with independent sources!
Consider, for example, the example circuit shown in Figure 12. If we are only interested in the
output voltage v 2, we may find the response to the voltage source first, then the response to the
current source, then the total response is the sum of the two. To find the response to the voltage
source, we must “turn off” the current source. This is done by assuming that it is not there. (After
all, a current source with zero current is just an open circuit!). The resulting network is as in
Figure 14.
R
2
+
+
V v
R
2v
3
−
−
Figure 14: Superposition Fragment: Voltage Source
Note that the resistance R 1 does not appear here. This is because a resistance in parallel with
a voltage source is just a voltage source, unless one is interested in current in the resistance. The
output voltage is just:
R
3
v 2v = V
R 2 + R 3
Next, we “turnoff”thevoltagesourceand “turnon”thecurrent source. Notethat avoltagesource
that has been turned off is a short circuit, because that implies zero voltage. The network is as
shown in Figure 15
R
2
+
I v
R
2i
3
−
Figure 15: Superposition Fragment: Current Source
The response to this is:
v 2i = IR 2||R 3
The total response is then just:
R R R
3 2 3
v 2 = v 2v + v 2i = V + I
R 2 + R 3 R 2 +R 3
8 Thevenin and Norton Equivalent Circuits
A particularly important ramification of the property of linearity is expressed in the notion of
equivalent circuits. To wit: if we are considering the response of a network at any given terminal
pair, that is a pair of nodes that have been brought out to the outside world, it follows from the
properties of linearity that, if the network is linear, the output at a single terminal pair (either
voltage or current) is the sum of two components:
1. The response that would exist if the excitation at the terminal pair were zero and
2. The response forced at the terminal pair by the exciting voltage or current.
This notion may be expressed with either voltage or current as the response. These yield the
Thevenin and Norton equivalent networks, which are exactly equivalent. At any terminal pair, the
properties of a linear network may be expressed in terms of either Thevenin or Norton equivalents.
The Thevenin equivalent circuit is shown in Figure 16, while the Norton equivalent circuit is shown
in Figure 17.
i
+ R +
th
v V th
−
−
Figure 16: Thevenin Equivalent Network
i
+
R I
v n
eq
−
Figure 17: Norton Equivalent Network
The Thevenin and Norton equivalent networks have the same impedance. Further, the equiva­
lent sources are related by the simple relationship:
V = R I (13)
Th eq N
The Thevenin Equivalent Voltage, the source internal to the Thevenin equivalent network, is
the same as the open circuit voltage, which is the voltage that would appear at the terminals of
the equivalent circuit were it to be open circuited. Similarly, the Norton Equivalent Current is the
same as minus the short circuit current.
To consider how we might use these equivalent networks, consider what would happen if the
Wheatstone bridge were connected by some resistance across its output, as shown in Figure 18
+ +
R v R v
1 1 3 3
+ − −
v − o
+
v
s
R
5
− + +
R v R v
2 3 4 4
− −
Figure 18: Wheatstone Bridge With Output Resistance
The analysis of this situation is simplified substantially if one recognizes that each side of the
bridge can be expressed as either a Thevenin or Norton equivalent network. We may proceed to
solve the problem by finding the equivalent networks for each side, then paste them together to
form the whole solution. So: consider the equivalent network for the left-hand side of the network,
formed by the elements V, R 1 and R 2. This is shown in Figure 19.
+ R1
RTh l
V
+
−
R2 VTh l
−
Figure 19: Construction of Equivalent Circuit
Where, here, the components of the equivalent circuit are:
R
2
v = V
Thl
R 1 + R 2
R eql = R 1||R 2
Similarly, the right side of the network is found to have an equivalent source and resistance:
R
4
v = V
Thr
R 3 + R 4
R eqr = R 3||R 4
And the whole thing behaves as the equivalent circuit shown in Figure 20
RTh l R5 RTh r
+ +
VTh l VTh r
− −
Figure 20: Equivalent Circuit
This is, of course, easily solved for the current through, and hence the voltage across, the
resistance R 5, which was desired in the first place:
R R R
5 2 5
v 5 =(v Thl −v Thr ) = V −fracR 4 R 3 + R 4
R 5 + r eql + r eqr R 1 + R 2 R 5 + R 1||R 2 + R 3||R 4
9 Two Port Networks
Sofar,wehavedealtwith anumberof networkswhich maybesaidtobe one port orsingle-terminal­
pair circuits. That is, the important action occurs at a single terminal pair, and is characterized
by an impedance and by either a open circuit voltage or a short circuit current, thus forming either
a Thevenin or Norton equivalent circuit. A second, and for us very important, class of electrical
network has two (or sometimes more) terminal pairs. We will consider formally here the two port
network, illustrated schematically in Figure 21.
There are a number of ways of characterizing this type of network. For the time being, consider
thatitis passive, sothatthereisnooutput without someinput and therearenodependent sources.
i i
1 2
+ +
v v
1 2
− −
Figure 21: Two-Port Network
Then we may characterize the network in terms of the currents at its terminals in terms of the
voltages, or, conversely, we may describe the voltages in terms of the currents at the terminals.
These two ways of describing the network are said to be the admittance or impedance parameters.
These may be written in the following way:
The impedance parameter point of view would yield, for a resistive network, the following
relationship between voltages and currents:
v R R i
1 11 12 1
= (14)
v R R i
 2 21 22 2 
Similarly, the admittance parameter point of view would yield a similar relationship:
i G G v
1 11 12 1
= (15)
i G G v
 2 21 22 2 
These two relationships are, of course, the inverses of each other. That is:
−1
G G R R
11 12 11 12
= (16)
G G R R
 21 22 21 22 
If the networks are linear and passive (i.e. there are no dependent sources inside), they also
exhibit the property of reciprocity. In a reciprocal network, the transfer impedance or transfer
admittance is the same in both directions. That is:
R 12 = R 21
G 12 = G 21 (17)
Itisoftenuseful toexpresstwo-portnetworksintermsof T orΠ networks, showninFigures22
and 23.
Sometimes it is useful to cascade two-port networks, as is shown in Figure 24. The resulting
combination is itself a two-port. Suppose we have a pair of networks characterized by impedance
parameters:
v R R i
1 11 12 1
=
v R R i
 2 12 22 2 
R − R R − R
11 12 22 12
R
12
Figure 22: T- Equivalent Network
G
12
G − G G − G
11 12 22 12
Figure 23: Π-Equivalent Network
v R R i
3 33 34 3
=
v R R i
 4 34 44 4 
By noting that v 2 = v 3 and i 3 = −i 2, it is possible to show, with a little manipulation, that:
 
v R R i
1 = 11 14 1
 
v R R i
 4 14 44 4 
where
R2
 
12
R 1
1 = R 11 −
R 33
R 22 +
R2
 
34
R 4
4 = R 44 −
R 22 +
R 33
R R
12 34
R 14 =
R 22 + R 33
10 Inductive and Capacitive Circuit Elements
So far, we have dealt with circuit elements which have no memory and which, therefore, are
characterized by instantaneous behavior. The expressions which are used to calculate what these
elements are doing are algebraic (and for most elements are linear too). As it turns out, much of
the circuitry we will be studying can be so characterized, with complex parameters.
However,wetakeaquickdiversiontodiscussbrieflythetransientbehaviorof circuitscontaining
capacitors and inductors.
i1 i2 i3 i4
+ + + +
v1 1 v 2 v 3 2 v4
− − − −
Figure 24: Cascade of Two-Port Networks
v
i v i
c c l l
L
C
Figure 25: Capacitance and Inductance
Symbols for capacitive and inductive circuit elements are shown in Figure 25. They are char­
acterized by the relationships between voltage and current:
dv di
c 
i = C v = L (18)
c 
dt dt
Note that, while these elements are linear, since time derivatives are involved in their char­
acterization, expressions describing their behavior in networks will become ordinary differential
equations.
10.1 Simple Case: R-C
i i
c + r
C v R
−
Figure 26: Simple Case: R-C
Figure 26 shows a simple connection of a resistance and a capacitance. This circuit has only
two nodes, so there is a single voltage v across both elements. The two elements produce the
constraints:
v
i =
r
R
dv
i =
c
dt
and, since i = −i ,
r c
dv 1
+ v = 0
dt RC
Now, we know that this sort of first-order, linear equation is solved by:
− t
v ∼ e RC
(To confirm this, just substitute the exponential into the differential equation.) Then, if we have
some initial condition, say v(t = 0) = V 0, then
− t
v = V 0 e RC
This was a trivial case, since we don’t describe how that initial condition might have taken
place. But consider a closely related problem, illustrated in Figure 27.
10.2 Simple Case with Drive
R
+ +
v C v
c
s
− −
Figure 27: RC Circuit with Drive
The analysis of this circuit is accomplished by noting that it contains a single loop, and adding
up the voltages around the loop we find:
dv
c
RC + v = v
c s
dt
Now, assume that the voltage source is a step:
= V
u−1(t)
v
s
s
We should define the step function with some care, since it is of quite a lot of use. The step is
one of a hierarchy of singularity functions. It is defined as:
0 t < 0
u−1(t)= (19)
1 t > 0
 
Now, remembering that differential equations have particular and homogeneous solutions, and
that for t > 0 a particular solution which solves the differential equation is:
v = V
cp
Of course this does not satisfy the initial condition which is that the capacitance be uncharged:
v (t = 0+) = 0. Again, remember that the whole solution is the sum of the particular and a
c
homogeneous solution, and that the homogeneous solution is the un-driven case. To satisfy the
initial condition, the homogeneous solution must be:
− t
c ch = −Ve RC
So that the total solution is simply:
− t
v c = V 1−e RC
 
Next, suppose v
= u−1(t)V cosωt. We know the homogeneous solution must be of the same
s
form, but the particular solution is a bit more complicated. In later chapters we will learn how to
make the process of extracting the particular solution easier, but for the time being, let’s assume
that with a sinusoidal drive we will get a sinusoidal response of the same frequency. Thus we will
guess
v = V cos(ωt−φ)
cp cp
The time derivative is
dv
cp
= ωV sin(ωt−φ)
cp
dt
so that we can find an algebraic equation for the particular solution:
V cosωt = V (cos(ωt−φ)+ωRCsin(ωt−φ))
cp
Note the trigonometric identities:
cos(ωt−φ) = cosφcosωt+sinφsinωt
sin(ωt−φ) = −sinφcosωt+cosφsinωt
Since the sine and cosine terms are orthogonal, we can equate coefficients of sine and cosine to
get:
V = V [cosφ+ ωRCsinφ]
cp
0 = V [sinφ+ ωRCcosφ]
cp
The second of these can be solved for the phase angle:
−1
ωRC
φ = tan
and squaring both equations and adding:
V2 = V2 1+(ωRC) 2
cp
 
so that the particular solution is:
V
v = cos(ωt−φ)
cp
2
1+(ωRC)
 
Finally, if the capacitor is initially uncharged (v (t = 0+) = 0), we can add in the homogeneous
c
solution (we already know the form of this), and find the total solution to be:
V − t
v c p = cos(ωt−φ)−cosφe RC
2
1+(ωRC)
 
 
This is shown in Figure 28
R=1, C=1, OM = 10
0.8
0.6
0.4
0.2
0
pcV
−0.2
−0.4
−0.6
−0.8
−1
−1.2
0 0.5 1 1.5 2 2.5 3 3.5 4 4.5 5
t
Figure 28: Output Voltage for RC Example
10.3 Second-Order System Example
R R
1 2
+
+
L i L v
v 1 o
s
i
− 2 −
Figure 29: Two-Inductor Circuit
Figure 29 shows a network with two inductances and two resistances. Assume that this is
driven by a voltage step: v
= V
u−1(t). Note that, with two inductances, we will require two
s
s
initial conditions to complete the solution.
The steady state (particular) solution is v = 0. There will, of course, be current flowing in
o
each of the inductances, but if excitation is constant there will be no time derivative of current so
that voltage across each of the inductances will eventually fall to zero.
The initial conditions may be found by inspection. Right after t = 0 (note we use t = 0+ for
this), output voltage must be:
v (t = 0+) = V
o s
This must be so since current cannot be made to flow instantaneously in either inductance, so that
there is no current in either resistance.
The secondinitial condition is the rate of change of voltageright afterthe instant of the voltage
step. To find this, note that output voltage is equal to the source voltage minus the voltage drops
across each of the two resistances.
v o = v s −R 2 i 2 −R 1(i 1 +i 2)
If we differentiate this with respect to time and note that the time derivative of a constant (after
the step the input voltage is constant) is zero:
dv di di
o 2 1
(t = 0+) = −(R 1 + R 2) −R 1
dt dt dt
Now, since right after the instant of the step both inductances have the source voltage V across
s
them:
di di V
1 2 s
| t=0+ = | t=0+ =
dt dt L
the rate of change of voltage at t = 0+ is:
dv o 2R 1 + R 2
| t=0+ = − V s
dt L
Now, we can find the homogeneous solution using the loop method. Setting the source to zero,
assume a current i in the left-hand loop and i in the right-hand loop. KVL around these two
a b
loops yields:
d
R 1 i a + L (i a −i b ) = 0
dt
di di
b a
R 2 i b +2L −L = 0
dt dt
With a little manipulation, these become:
di
a
L +2R 1 i a + R 2 i b = 0
dt
di
b
L + R 1 i a + R 2 i b = 0
dt
Assume that solutions are of the form Iest, and this set of simultaneous equations becomes:
(sL +2R 1) R 2 I a 0
=
 R 1 (sL + R 2) I b 0 
We need to solve this for s (to find values of s for which this set is true, and that is simply the
solution of the “characteristic equation”
(sL +2R 1)(sL + R 2)−R 1 R 2 = 0
which is the same as:
s2 + 2R 1 + R 2 s + R 1 R 2 = 0
L L L
Now, for the sake of “nice numbers”, assume that R 1 = 2R, R 2 = 3R. The characteristic
equation is:
R R 2
s2 +7 s +6 = 0
L L
 
which factors nicely into (s + R )(s +6R ) = 0, or the two values of s are s = −R and s = −6R .
L L L L
Since the particular solution to this one is zero, we have a total solution which is:
v o = Ae −R L t + Be −6R L t
The initial conditions are:
v o | t=0+ = A+ B = V s
dv R R
o
| t=0+ = − (A+6B) = −7 V s
dt L L
The solution to that pair of expressions is:
V 6V
s s
A = − B =
5 5
and this is shown in Figure 30.
Two Inductor Example
1.2
1
0.8
0.6
oV
0.4
0.2
0
−0.2
0 0.5 1 1.5 2 2.5 3 3.5 4 4.5 5
t
Figure 30: Output Voltage for Two Inductor Example
Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes Chapter 2
AC Power Flow in Linear Networks ∗
J.L. Kirtley Jr.
1 Introduction
Electric power systems usually involve sinusoidally varying (or nearly so) voltages and currents.
Thatis, voltage and current arefunctionsof timethat arenearlypuresinewaves at fixedfrequency.
In North America, most ships at sea and eastern Japan that frequency is 60 Hz. In most of the
rest of the world it is 50 Hz. Normal power system operation is at this fixed frequency, which is
why we study how systems operate in this mode. We will deal with transients later.
This note deals with alternating voltages and currents and with associated energy flows. The
focus is on sinusoidal steady state conditions, in which virtually all quantities of interest may be
represented by single, complex numbers.
Accordingly, this section opens with a review of complex numbers and with representation of
voltage and current as complex amplitudes with complex exponential time dependence. The dis­
cussion proceeds, through impedance, to describe a pictorial representation of complex amplitudes,
called phasors. Power is then defined and, in sinusoidal steady state, reduced to complex form.
Finally, flow of power through impedances and a conservation law are discussed.
Secondarily,thissectionofthenotesdealswithtransmissionlinesthathaveinterestingbehavior,
both in the time and frequency domails.
2 Complex Exponential Notation
Start by recognizing a geometric interpretation for a complex number. If we plot the real part on
the horizontal (x) axis and the imaginary part on the vertical (y) axis, then the complex number
√
z = x+jy (where j = −1) represents a vector as shownin Figure 1. Note that this vector may be
represented not only by its real and imaginary components, but also by a magnitude and a phase
∗ c2007 James L. Kirtley Jr.
1
Im(·)
y z = x + jy
 
 
 
 
 
 
 
 φ
 
 
 
 
x
Re(·)
Figure 1: Representation of the complex number z = x + jy
Im(·)
sinφ
 
 
 
 
 
 
 Magnitude = 1
 φ
 
 
 
 
cosφ Re(·)
Figure 2: Representation of ejφ
angle:
|z| = x2 + y2 (1)
 y
φ = arctan( ) (2)
x
The basis for complex exponential notation is the celebrated Euler Relation:
ejφ = cos(φ)+j sin(φ) (3)
which has a representation as shown in Figure 2.
Now, a comparison of Figures 1 and 2 makes it clear that, with definitions (1) and (2),
z = x + jy = |z|ejφ (4)
It is straightforward, using (3) to show that:
ejφ + e −jφ
cos(φ) = (5)
2
ejφ −e −jφ
sin(φ) = (6)
2j
(7)
2
Im(·)
z
 
 
 
 
 
 
 
 
 
 
 
 
 
 Re(·)
 
 
 
 
 
 
 
 
 
 z ∗
Figure 3: Representation Of A Complex Number And Its Conjugate
The complex exponential is a tremendously useful type of function. Note that the product of
two numbers expressed as exponenentials is the same as the exponential of the sums of the two
exponents:
ea eb = ea +b (8)
Notethatitisalsotruethatthereciprocal of anumberinexponential notationisjusttheexponential
of the negative of the exponent:
1
−a
= e
(9)
ea
|ejφ1 and z
|ejφ2 , then the product of the two numbers
Then, if we have two numbers z
= |z
= |z
1
2
1
2
is:
z z = |z ||z |ej(φ1+φ2) (10)
1 2 1 2
and the ratio of the two numbers is:
z |z |
1 ej(φ1 −φ2)
1
=
(11)
z |z |
2 2
The complex conjugate of a number z = x + jy is given by:
∗
z = x −jy (12)
The sum of a complex number and its conjugate is real:
∗
z + z = 2Re(z)= 2x (13)
while the difference is imaginary:
∗
z −z = 2jIm(z) = 2jy (14)
where we have used the two symbols Re(·) and Im(·) to represent the operators which extract the
real and imaginary parts of the complex number.
The complex conjugate of a complex number z = |z|ejφ may also be written as:
−jφ
∗
= |z|e
z
(15)
so that the product of a complex number and its conjugate is real:
zz ∗ = |z|ejφ|z|e −jφ = |z| 2 (16)
3
3 Sinusoidal Time Functions
A sinusoidal function of time might be written in at least two ways:
f(t) = A cos(ωt + φ) (17)
f(t) = B cos(ωt)+C sin(ωt) (18)
A third way of writing this time function is as the sum of two complex exponentials:
f(t)= Xejωt + X ∗ e −jωt (19)
Note that the form of equation 19, in which complex conjugates are added together, guarantees
that the resulting function is real.
Now, to relate equation 19 with the other forms of the sinusoidal function, equations 17 and 18,
see that X may be expressed as:
X = |X|ejψ (20)
Then equation 19 becomes:
f(t) = |X|ejψejωt + |X| ∗ e −jψe −jωt (21)
∗
−j(ψ+ωt)
|X|ej(ψ+ωt)
e
+ |X|
=
(22)
= 2|X|cos(ωt + ψ) (23)
Then, the coefficients in equation 17 are related to those of equation 19 by:
A
|X| = (24)
2
ψ = φ (25)
Alternatively, we could write
X = x + jy (26)
in which the real and imaginary parts of X are:
x = |X|cos(ψ) (27)
y = |X|sin(ψ) (28)
Then the time function is written:
f(t) = x(ejωt + e −jωt)+jy(ejωt −e −jωt) (29)
= 2x cos(ωt)−2y sin(ωt) (30)
Thus:
A = 2x (31)
B = −2y (32)
A B
X = −j (33)
2 2
4
It is also possible to write equation 19 in the form:
f(t)= Re(2Xejωt) (34)
While both expressions (19 and 34) are equivalent, it is advantageous to use one or the other of
them, according tocircumstances. The first notation (equation 19) is thefull representation of that
sinusoidal signal and may be used under any circumstances. It is, however, cumbersome, so that
the somewhat more compact version(equation 34) is usually used. Chiefly when nonlinear products
such as power are involved, it is necessary to be somewhat cautions in its use, however, as we will
see later on.
4 Impedance
Because it is so easy to differentiate a complex exponential time signal, such a way of representing
time signals has real advantages in electric circuits with all kinds of linear elements. In Section 1 of
these notes, we introduced the linear resistance element, in which voltage and current are linearly
related. We must now consider two other elements, inductances and capacitances. The inductance
⊃
⊃
⊃L C
⊃
Figure 4: Inductance and Capacitance Elements
produces a relationship between voltage and current which is:
di
L
v = L (35)
L
dt
If voltage and current are sinusoidal functions of time:
v = Vejωt +V ∗ e −jωt
i = Iejωt + I ∗ e −jωt
Then the relationship between voltage and current is given simply by:
V = jωLI (36)
This is a particularly simple form, and as can be seen is directly analogous to resistance. We can
generalize ourviewofresistanceto complex impedance (orsimplyimpedance),inwhichinductances
have impedance which is:
Z = jωL (37)
L
The capacitance element is similarly defined. A capacitance has a voltage-current relationship:
dv
C
i = C (38)
dt
5
Thus the impedance of a capacitance is:
1
Z = (39)
C jωC
The extension to resistive network behavior is now obvious. For problems in sinusoidal steady
state, in which all excitations are sinusoidal, we may use all of the tricks of linear, resistive network
analysis. However, we use complex impedance in place of resistance.
The inverse of impedance is admittance:
1
Y =
Z
Series and parallel combinations of admittances and impedances are, of course, just like those
of conductances and resistances. For two elements in series or in parallel:
Series:
Z = Z + Z (40)
1 2
Y Y
1 2
Y = (41)
Y +Y
1 2
Parallel:
Z Z
1 2
Z = (42)
Z +Z
1 2
Y = Y + Y (43)
1 2
4.1 Example
Suppose we are to find the voltage v(t) in the network of Figure 5, in which i(t) = I cos(ωt). The
+
 i(t) < < > > R ⊃ ⊃ ⊃ L v(t)
< ⊃ −
 
Figure 5: Complex Impedance Network
excitation may be written as:
I I
i(t) = ejωt + e −jωt = Re Iejωt
2 2
 
Now, the complex impedance of the parallel combination of R and L is:
RjωL
R||jωL =
R + jωL
So that, if v(t) is represented by:
6
V V
v(t) = ejωt + e −jωt
2 2
= Re Vejωt
 
Then
RjωL
V = I
R + jωL
Now: the impedance Z may be represented by a magnitude and phase angle:
Z = |Z|ejφ
ωLR
|Z| =
(ωL)2 + R2
π ωL
φ = −arctan
2 R
Then, using relations developed here, v(t) may be written as:
ωLI
v(t) = cos(ωt +φ)
2
1+ ωL
R
 
 
Note thatthisexpressionrepresents only the sinusoidal steady state solution, and thereforedoes
not represent any starting transients.
5 System Functions and Frequency Response
If we are interested in the behavior of a linear system such as the circuits we have been discussing,
weoften speak of the system function. Thisis the(usually complex) ratiobetween output and input
of the system. System functions can express driving point behavior (impedance or its reciprocal,
admittance) or transfer behavior. We speak of voltage or current transfer ratios and of transfer
impedance(outputvoltagerelatedtoinputcurrent) andtransferadmittance(output current related
to input voltage).
Thesystemfunctionmay beexpressedinanumberof ways, oftenas aLaplace Transform. Such
is beyond the scope of this subject. However, it is important to understand one way of expressing
linear system behavior, in the form of frequency response. The frequency response of a system is
the complex number that relates output of the system to input as a function of frequency. Usually
it is expressed as a pair of numbers, magnitude and phase angle. Thus
|H(jω)|ejφ(jω)
H(jω) =
Subjects in Signals and Systems or Network Theory often spend some time on how to obtain
and plot the frequency response of a network in ways which are both useful and easy. For our
purposes, a straightforward, perhaps even “brute force” approach will do. Consider, for example,
the circuit shown in Figure 6.
7
1 mHy
∩∩∩∩
 
+ < +
V − in < < > > 1 kΩ V − ou t
 
Figure 6: Example Circuit for Frequency Response
This is just a voltage divider between an inductance and a resistance. We seek to find, and
then plot, the transfer ratio V /V of this network. A very little analysis yields an expression for
out in
the transfer function, which is:
V (jω) R 1
out
= =
V in (jω) R + jωL 1+jω L
R
The magnitude and angle of this function can be extracted in a number of ways. For the pur­
pose of these notes, we have done the mathematics using MATLAB. The specific instructions for
producing the frequency response plot are shown in Figure 7. Funamentally what is done is to
compute the system function for a number of frequencies (note that we use a way of computing
specific frequencies which produces a uniform spacing on a logarithmic scale, and then plotting the
magnitude (also on a logarithmic scale) and angle of that system function against frequency.
6 Phasors
Phasors are not weapons. They are a handy geometric trick which help us understand the nature
of sinusoidal steady state signals and systems. To start, consider the basis for complex exponential
time notation, the function ejωt. At any instant of time, this is a complex number: at time t = 0
it is equal to 1, at time ωt = π it is equal to j, and so forth. We may describe this function
2
as a vector, of length unity, rotating about the origin of the complex number plane, with angular
velocity ω. It has, of course, both real and imaginary parts, which are just the projections of the
vector onto the real and imaginary axes.
Now consider a sinusoidally varying signal x(t), which may be represented by:
∗
X X
x(t) = ejωt + e −jωt
2 2
This is the sum of two numbers, complex conjugates, which are, as functions of time, rotating in
opposite directions in the complex plane. The sum of the two is, of course, real. This is the same
time function as:
x(t) = Re Xejωt (44)
 
where the real part operator Re(·) simply takes the projection of the function on the real axis.
It might be helpful at this point to remember one of the features of complex arithmetic. Mul­
tiplication of two complex numbers results in a third complex number which has:
8
L=1e-3; % Set Parameter Values
R=1000;
e=3:.05:7; % This is a way of producing evenly
f=10 .^ e; % spaced points on a logarithmic chart
om=2*pi .* f; % Frequency in radians per second
H = 1 ./ (1 + j*L/R .* om); % This is the frequency response
subplot(211);
loglog(f, abs(H)) % Plot of magnitude
xlabel(’Frequency, Hz’);
ylabel(’Magnitude’);
grid
subplot(212);
semilogx(f, angle(H)) % Plot of angle
xlabel(’Frequency, Hz’)
ylabel(’Angle’)
grid
title(’Frequency Response of L-R’)
print(’freq.ps’)
Figure 7: MATLAB Program freq.m
1. a magnitude which is the product of the magnitudes of the two numbers begin multiplied and,
2. an angle which is the sum of the angles of the two numbers being multiplied.
Thus,multiplyinganumberby ejωt,whichhasa magnitude of unity and an angle whichisincreasing
with time at the rate ω, simply has the effect of setting that number spinning around the origin of
the complex plane.
It is therefore relatively easy to represent sinusoidally varying signals with just their complex
amplitudes, understanding that they also include ejωt, which provides time variation. The complex
amplitude includes not only the magnitude of the signal, but also a phase angle. Usually the phase
angle by itself is of little use, and must be related to some time reference. That is, as we will see,
it is the difference between phase angles that is important in most cases.
Impedancesandadmittances arealsocomplexnumbers,sothat phasors can beused tovisualize
therelationshipbetweenvoltages and currentsinanetwork. Thekeyhereisthatmultiplication and
division of complex numbers is the same as multiplication or division of magnitudes and addition
or subtraction of angles.
6.1 Example
Consider the simple network shown in Figure 9, and suppose that the current source is sinusoidal:
i = Re Iejωt
 
The impedance of the R-L combination is a complex number:
9
100
edutingaM
10−1
10−2
103 104 105 106 107
Frequency, Hz
Frequency Response of L−R
0
−0.5
elgnA
−1
−1.5
−2
103 104 105 106 107
Frequency, Hz
Figure 8: Frequency Response
Z = R + jωL = 1+j2
Now: the impedance may be represented in the complex plane as shown in Figure 10.
Voltage v is given by:
v = Re Vejωt
 
where:
V = ZI
Then the relationship between voltage and current is as shown in Figure 11. Note that the phase
angle between voltage and current is the same as the phase angle of the impedance.
Note that KVL may be represented graphically in the fashion of Figure 12.
Energy and Power
7
For any terminal pair with voltage and current defined as shown in Figure 13, power flow into the
element is:
p = vi (45)
10
R = 1Ω
∧∧
+ ∨∨
⊃
 i s v ⊃ ⊃ ωL = 2Ω
⊃
−
 
Figure 9: Example Circuit
Im(Z)
2 Z
 
 
 
 
 
 
 
 Re(Z)
1
Figure 10: Complex Impedance
Power is expressed in Watts (W), and one Watt is the product of one Volt and one Ampere.
Energy transferred over an interval of time t 0 to t 1 is the integral of power:
t1
w = v(t)i(t)dt (46)
 t 0
Energy is expressed in Joules, and one Joule is one Watt- Second. A Joule is also a Newton-Meter
(force times distance), and therefore a Watt is a Newton-Meter per Second.
Consider the behavior of the three types of linear, passive elements we have encountered:
• Resistance: v = Ri, Instantaneous power is:
v2
2
p = Ri
= (47)
R
Im(·)
V
 
 
 
 
 
 
 
I
 Re(·)
Figure 11: Voltage and Current
11
Im(V )
V
 
 
 
 
V
 L
 
 
 Re(V )
V
R
Figure 12: Components of Voltage
 i
+
v element
−
Figure 13: Definition for Power
• Inductance: v = L di , Instantaneous power is:
dt
di 1 di2
p = iL = L (48)
dt 2 dt
The quantity w = 1Li2 may be interpreted as energy stored in the inductance, so that
L 2
p = dwL. We will need to refine this definition later, when we consider electromechanical
dt
interactions or nonlinear elements, but it will do for now.
• Capacitance: i = C dv , Instantaneous power is:
dt
dv 1 dv2
p = vC = C (49)
dt 2 dt
The quantity w = 1 Cv2 may similarly be interpreted as energy stored in the capacitance.
C 2
Next, consider the power input to each of these three elements under sinusoidal steady state
conditions:
• Resistance: if i = I cos(ωt + θ), then
p = RI2 cos 2 (ωt + θ)
RI2
= [1+cos2(ωt + θ)] (50)
2
12
Thus, average power into the resistance is:
1
2
P = RI
(51)
2
• Inductance: if i = I cos(ωt + θ), then voltage is v = −ωLI sin(ωt +θ), and power is:
2
cos(ωt + θ)sin(ωt + θ)
p = −ωLI
ωLI2
= − sin2(ωt + θ) (52)
2
Average power into the inductance is zero. Instantaneous energy stored in the inductance is
1
w = LI2 cos 2 (ωt + θ)
L
2
and that has an average value:
1
2
< w >= LI
(53)
L
4
• Capacitance: if v = V cos(ωt + φ), then i = −ωCV sin(ωt + φ), and power is:
ωCV 2
p = − sin2(ωt + φ) (54)
2
which has zero time average. Energy stored in the capacitance is:
1
2
2
w = CV
(ωt + φ)
cos
C
2
which has time average:
1
< w >= CV 2 (55)
C
4
Now, considerpower flowintoaset of terminals inasituation inwhichboth voltage and current
are sinusoidal and have the same frequency, but possibly different phase angles:
v(t) = V cos(ωt + φ)
i(t) = I sin(ωt +θ)
It is necessary to revert to the original form of complex notation, as in equation 19, to compute
power.
1
v(t) = Vejωt + V ∗ e −jωt (56)
2
1 
i(t) = Iejωt + I ∗ e −jωt (57)
2
 
Instantaneous power is the product of voltage and current:
1
∗
∗
∗
∗
−j2ωt
Iej2ωt
+ V
p = VI
+ V
I + V
I
e
(58)
4
 
13
This is directly equivalent to:
1
∗
Iej2ωt
p = Re VI
+ V
(59)
2
 
This is, in turn, expressible as:
1
p = |V ||I|[cos(φ −θ)+cos(2ωt + φ + θ)] (60)
2
From this, we extract “real power”, or time- average power:
1 1
∗
P = Re [VI ] = |V ||I|cos(φ −θ) (61)
2 2
The ratio between real power and apparent power P = 1 |V ||I| is called the power factor, and
a 2
is simply:
power factor = cosψ = cos(φ −θ) (62)
The power factor angle ψ = φ −θ is the relative phase shift between voltage and current.
Thisexpressionfortime-averagepowersuggestsadefinitionforsomething wemight call complex
power:
1
∗
P + jQ = VI (63)
2
in which average power P is the real part. The magnitude of this complex quantity is the apparent
power. Theimaginary partiscalled reactive power. Ithasimportancewhich willbediscussedlater.
Different units are used for real, reactive and apparent power, in order to gain some distinction
between quantities. Usually we will express real power in watts (W) (or kW, MW,...). Apparent
power is expressed in volt-amperes (VA), and reactive power is expressed in volt-amperes-reactive
(VAR’s).
To obtain some more feeling for reactive power, expand the time- varying part of the expression
for instantaneous power:
1
p = |V ||I|cos(2ωt + φ + θ)
varying
2
Now, using the trig identity cos(x + y) = cosx cosy −sinx siny, and assigning x = 2ωt +2φ and
y = −ψ = θ −φ, we have:
1
p = |V||I|[cos2(ωt + φ)+sinψ sin2(ωt + φ)]
varying
2
Thus, total instantaneous power is:
1 1
p = |V||I|cosψ [1+cos2(ωt + φ)]+ |V||I|sinψ sin2(ωt + φ) (64)
2 2
Now, if we note expressions for P and Q, we can re-write this as:
p = P [1+cos2(ωt + φ)]+Q sin2(ωt + φ) (65)
Thus, real power P represents not only time average power but also the pulsations that go with
time average power. Reactive power Q represents energy exchange with zero average value.
14
7.1 RMS Amplitude
1
Note that, in all of the expressions for power used so far, a factor of appears. This is, of course,
2
because the average value of the product of two sinusoids of the same frequency has a value of half
of the products of their peak amplitudes multiplied by the cosine of the relative phase angle. It has
become common to use a different measure of voltage amplitude, which is called root-mean-square
or simply RMS. The proper definition for the RMS value of a waveform is somewhat complex,
but boils down to that value which, if it were DC, would dissipate the same power in a resistor.
It is possible to define RMS for any periodic waveform. However, since we will be dealing with
sinusoids, the definition is even easier. Clearly, since power dissipated in a resistor is, in terms of
peak amplitudes:
1 |V |2
P =
2 R
then the RMS amplitude must be:
|V |
V = √ (66)
RMS
2
Then,
V 2
P = RMS
R
As we will see, RMS amplitudes are the default for most situations: when a circuit is described as
“120 Volts AC”, the designation virtually always means 120 Volts, RMS. The peak amplitude of
√
this is |V | = 2· 120 ≈ 170 volts. Often you will see sinusoidal waveforms expressed in the form:
√
v = 2V cos(ωt)
RMS
in which V is obviously the RMS amplitude.
RMS
7.2 Example
Consider the simple network of Figure 14. We will calculate the instantaneous power flow into that
network in terms we have been discussing. Assume that the voltage source has RMS amplitude
 + − v < < > > R ⊃ ⊃ ⊃ X
< ⊃
 
Figure 14: Example Circuit
of 120 volts and R and X are both 100 Ω. Then:
v(t) = 170cosωt
The admittance of this network is:
1 j
Y = −
100 100
15
Instantaneous Power Flow
350
300
250
200
sttaW
150
,rewoP
100
50
0
−50
−100
0 1 2 3 4 5 6 7 8 9 10
Frequency * Time, Radians
Figure 15: Power Flow For Example Circuit
so that the complex amplitude of current is:
I = 1.7−j1.7
And then complex power is:
1
P + jQ = 170(1.7+ j1.7)
2
Real and reactive power are, respectively: P = 144 W, Q = 144 VAR. This gives a power factor
◦
angle of ψ = arctan(1) = 45 . Then, instantaneous power is:
◦ ◦
p = 144[1+cos2(ωt −45 )]+144sin2(ωt −45 )
This is illustrated in Figure 15.
8
A Conservation Law
It is possible to show that complex power is conserved in the same way as we expect time average
power to be conserved. Consider a network with a collection of terminals and with a collection of
internal branches. Instantaneous power flow into the network is:
p = vi
in
terminals
 
Notethatthisexpressionholdsforvoltageandcurrent expressed over any completeset of terminals.
That is, if it is possible to delineate the terminals of the network into a set of pairs, the voltages
might correspond to voltages across the pair, while currents would flow between the terminals of
each pair. Alternatively, the voltages might correspond to single node-to-datum voltage, while
16
currents would then be single input node currents. Since power can go only into network elements,
it follows that the sum of internal branch powers must be equal to the sum of terminal powers:
vi = vi (67)
terminals branches
 
If this is true for instantaneous power, it is also true for complex power:
VI = VI (68)
terminals branches
 
Now, if the network is made up of resistances, capacitances and inductances,
VI = VI + VI + VI (69)
terminals resistances inductances capacitances
 
For these individual elements:
• Resistances: VI ∗ = R|I|2
• Inductances: VI ∗ = jωL|I|2
• Capacitances: VI ∗ = −jωC|V |2
Then equation 69 becomes:
VI = R|I| 2 + j ωL|I| 2 −j ωC|V | 2 (70)
terminals resistances inductances capacitances
 
Then, identifying individual terms:
VI = 2(P +jQ) Total Complex Power into Network
terminals
 
2
= 2 < p > Power Dissipated in Resistors
R|I|
r
resistances
 
j ωL|I| 2 = 4ω < w > Energy Stored in Inductances
L
inductances
 
j ωC|V | 2 = 4ω < w > Energy Stored in Capacitances
C
capacitances
 
So, for any RLC network:
P + jQ = < p > +2jω < w > − < w > (71)
r L C
⟨ ⟩
resistors inductors capacitors
 
⎡ ⎦
9 Power Flow Through An Impedance
Consider the situation shown in Figure 16. This actually represents a number of important situ­
ations in power systems, where the impedance Z might represent a transmission line, transformer
or motor winding. Of interest to us is the flow of power through the impedance. Current is given
17
 i l + v l −
Z + 
 + 
V
V
− 1 − 2
 
Figure 16: Power Flow Example
by:
V −V
1 2
i =
(72)
l
Z
Then, complex power flow out of the left- hand voltage source is:
∗ ∗
1 V −V
1 2
P + jQ = V
(73)
∗
1
Z
2
 
Now, the complex amplitudes may be expressed as:
V = |V |ejθ (74)
1 1
V = |V |ejθ+δ (75)
2 2
where δ istherelative phaseanglebetweenthetwovoltagesources. Complexpowerattheterminals
of the voltage source V is now given by:
1
|V |2 |V ||V |e −jδ
1 1 2
P + jQ = − (76)
∗ ∗
2Z 2Z
This is describable as a circle in the complex plane, with its origin at
|V |2
1
∗
2Z
and its radius equal to:
|V ||V |
1 2
2|Z|
Now suppose the impedance through which we are passing power is describable as a simple
inductance as shown in Figure 17. This is perhaps the simplest of transmission line models which
represents only the inductive impedance of the line. Line inductance arises because currents in the
line produce magnetic fields, and this is a fair model for most lines which are fairly ’short’. More
on that in the next section. This line has the impedance
Z = jωL = jX
L
√ √
Now, switching to RMS amplitudes, so that V = 2V and V = 2V , Then real and
s 1 r 2
reactive power flow are:
∗
|2 −V
V
|V
P + jQ = V I ∗ = j
s
s
r
s s s X
l
|V |2 −V ∗ V
P + jQ = −V I ∗ = j r s r
r r r X
l
18
I L
Vs Vr
Figure 17: Simplest Transmission Line Model
Now if we assume that the voltages are of the form:
V = V ejφ
s s
V = V ejθ
r r
and that the relative phase angle between them is φ −θ = δ and doing a little trig:
V V sinδ
s r
P =
s
X
L
V 2 −V V cosδ
Q = s s r
s
X
L
V V sinδ
s r
P = −
r
X
L
V 2 −V V cosδ
Q = r s r
r
X
L
A picture of this locus is referred to as a power circle diagram, because of its shape. Figure 18
shows the construction of a sending end power circle diagram for equal sending-end and receiving-
end voltages and a purely reactive impedance.
Q
2
V
X
δ
P
Figure 18: Power Circle, Equal Voltages
As a check, consider the reactive power consumed by the line itself: we expect that Q +Q =
s r
Q , and so:
L
V2 + V2 −2V V cosδ
Q + Q = s r s r
s r
X
L
19
Notethatthevoltageacrossthelineelementitselfisfoundusingthelawof cosines(seeFigure19:
V
s
δ
V
l
V
r
Figure 19: Illustration of the Law of Cosines
2
2
2
V
= V
+ V
−2V V cosδ
L s r s r
and, indeed,
V 2
Q = L
L
X
L
10 Compensated Line
L
V s Cs Cr Vr
Figure 20: Transmission Line Model
Perhaps a more commonly used model for a transmission line is as shown in Figure 20. This
represents not only the fact that most transmission lines have, in addition to series inductance,
parallel capacitance but also the fact that many transmission lines are shunt compensated. This
may be represented as a two-port network with the admittance parameters, using X = jωL and
L
−j
X =
, :
C ωC
1 1
Y = −
ss jX jX
L C1
1
Y = Y =
sr rs jX
L
1 1
Y = −
rr jX jX
L C2
It is fairly clear that, for voltage sources at both ends, real and reactive power flow are:
V V sinδ
s r
P =
s
X
L
20
1 1 V V cosδ
s r
2
Q = V
− −
s s X X X
 L C1 L
V V sinδ
s r
P = −
r
X
L
1 1 V V cosδ
s r
2
Q = V
− −
r s X X X
 L C2 L
Q
2 1 1
V
X X
L C
δ
P
Figure 21: Power Circle, Equal Voltages, Compensation Offset
The power circle for this sort of line is similar to that of the simpler model, but the center is
offset to smaller reactive component, as shown in Figure 21.
An interesting feature of transmission lines is illustrated by what might happen were the re­
ceiving line to be open: in that case:
1
V = V
r s 1−ω2LC
Depending on the values of frequency, inductance and capacitance this could be arbitrarily
large, and this is a potential problem, particularly for longer lines, as we will discuss in the next
section.
11 Transmission Lines
A transmission line is really a long, continuous thing. It has inductance which is really inductance
per unit length multiplied by the line length, but it also has a continuous capacitance. We might
attempttorepresent alongtransmissionlineasaseriesof relatively ’short’sectionseach represented
by an inductance and a capacitance. These ’lumped parameter’ models for lines are actually
used in many system studies, particularly in physical analog models called ’Transmission System
Simulators’. (We built one of these at MIT in the 1970’s). After the next section you might
contemplate the definition of ’short’ for our purposes here, but generally each lumped parameter
capacitance and resistance pair would represent a few to a few tens of miles.
11.1 Telegrapher’s Equations
Peering at the model presented in Figure 22, one might divine that a proper representation of
voltage and current, both of which are functions of time and distance along the line, might be:
21
L L L L
C C C C
Figure 22: Transmission Line Lumped Parameter Model
∂v ∂i
= −L
l
∂x ∂t
∂i ∂v
= −C
l
∂x ∂t
These are known as the “Telegrapher’s Equations” and represent the fact that inductance
presents voltage drop along the line in proportion to rate of change of current and that capacitance
presents a change in current along the line in proportion to rate of change of voltage.
It is not difficult to eliminate either voltage or current from these to produce a wave equation.
For example, take the cross-derivatives and substitute the second of these equations into the first
to get:
∂2v ∂2v
= L C
∂x2 l l ∂t2
Now: this equation is solved by arbitrary functions which are of the form:
v(x,t) = v(x ±ut)
where the wave velocity is:
1
u = √
L C
l l
So now we can see that the voltage on the line is the sum of some waveform going in the
’positive’ direction and something else going in the ’negative’ direction:
v(x,t) = v +(x −ut)+v−(x + ut)
Thesamewillbetrueof current,and substitutingback intoeitherof thetelegrapher’sequations
yields:
1
i(x,t) = (v +(x −ut)−v−(x + ut))
L u
l
the product of inductance times wave velocity has the units of impedance:
L
l
L l u = = Z 0
 C l
This is often referred to as the ’characteristic impedance’ of the transmission line. This is also a
commonly used term: transmission cables are often referred to by their characteristic impedances.
For coaxial wires 50 to 72 ohms are common values. For high tension transmission lines somewhat
higher values are to be expected.
22
11.2 Surges on Transmission Lines
Consider the situation shown in Figure 23. Here the left-hand end of the line is driven by a current
source with a pulse (illustrated is a square pulse). This is actually not too far from the situation
thattransmissionlinesexperiencewithlightning, whichisusually representableasacurrent source,
typically of magnitude between 20 and 100 kA and duration of about 1µS. (Actually, it is not a
square pulse but that is not important here).
What will happen, if the pulse is short enough, is that it will launch a traveling wave in which
v + = Z 0 i + and i + is the current that was imposed. When this pulse reaches the far, or load end of
the line, we have the situation in which at that point:
v(t) = v + + v−
V−
v
+
i(t) = −
Z Z
0 0
and, of coures, v = Ri.
The ’reflected’, or negative going wave will have magnitude:
R −1
Z0
v− = v +
R +1
Z0
In the extreme case of an open circuit, the magnitude of the voltage pulse at the end of the
transmission line is exactly twice that of the propagating pulse. In the case of a short circuit, of
course, the magnitude of the voltage is zero, the current in the short is double the current of the
pulseitself, and thepulseis reflected, butgoing inthereverse direction with apolarity theopposite
of the forward-going pulse. This is illustrated in cartoon form in Figure 23.
i i
R > Z
0
v v
I s R
i
R < Z
0
v
Figure 23: Pulse Propagation on a Transmission Line
11.3 Sinusoidal Steady State
Now, consider a transmission line operating in the sinusoidal steady state. As suggested by Fig­
ure 24, it is driven by a voltage source at one end and is loaded by a resistive load at the other.
Consistent with the voltage and currents that we know can exist on such a line, we know they will
be of this form:
23
V R
s
Figure 24: Transmission Line in Simple Configuration
ej(ωt−kx)
ej(ωt+kx)
v(x,t) = Re V +
+ V −
 V V 
− ej(ωt+kx)
+ ej(ωt−kx)
i(x,t) = Re
−
Z Z
0 0
 
 
Where the phase velocity is u = ω = √ 1 .
k LlCl
At the termination end of the line, at x = ℓ
V V + e −jkℓ + V − ejkℓ
R = I = Z 0 V
e−jkℓ −V
ejkℓ
−
+
This may be solved for the ratio of ’reverse’ to ’forward’ amplitude:
R −1
V − = V + e −2jkℓ Z R 0 +1
Z0
Since at the ’sending’ end:
V s = V + + V −
With a little manipulation it can be determined that
e −jkℓ R +1 + R −1
Z0 Z0
V = V
r s R + 1 + e− 2jkℓ R −1 
Z0 Z0
 
Further manipulation yields:
R
V = V Z0
r s R coskℓ + j sinkℓ
Z0
This might be made a bit more comprehensible when turned into a magnitude:
R
V
r
Z0
|
|=
V
2
s R coskℓ
+(sinkℓ) 2
Z0
 
 
If the line is loaded with a resistance equivalent to the ’surge impedance’ (so-called ’surge
impedance loading’, the receiving end voltage is the same as the sending end voltage. If it is more
heavily loaded, the receiving end voltage is less than the sending end and if it is less heavily loaded
the receiving end voltage is greater.
24
Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes Chapter 3
Polyphase Networks ∗
J.L. Kirtley Jr.
1 Introduction
Most electric power applications employ three phases. That is, three separate power carrying
circuite, with voltages and currents staggered symmetrically in time are used. Two major reasons
for the use of three phase power are economical use of conductors and nearly constant power flow.
Systems with more than one phase are generally termed polyphase. Three phase systems are
the most common, but there are situations in which a different number of phases may be used.
Two phase systems have a simplicity that makes them useful for teaching vehicles and for certain
servomechanisms. This is why two phase machines show up in laboratories and textbooks. Sys­
tems with a relatively large number of phases are used for certain specialized applications such as
controlled rectifiers for aluminum smelters. Six phase systems have been proposed for very high
power transmission applications.
Polyphasesystemsarequalitativelydifferentfromsinglephasesystems. Insomesense,polyphase
systems are more complex, but often much easier to analyze. This little paradox will become ob­
vious during the discussion of electric machines. It is interesting to note that physical conversion
between polyphase systems of different phase number is always possible.
This chapter starts with an elementary discussion of polyphase networks and demonstrates
some of their basic features. It ends with a short discussion of per-unit systems and power system
representation.
2 Two Phases
The two-phase system is the simplest of all polyphase systems to describe. Consider a pair of
voltage sources sitting side by side with:
v 1 = V cosωt (1)
v 2 = V sinωt (2)
∗ c2003 James L. Kirtley Jr.
Suppose this system of sources is connected to al “balanced load”, as shown in Figure 1. To
compute the power flows in the system, it is convenient to re-write the voltages in complex form:
 
i i
1 2
+ +
 + v v + v v
− 1 Z 1 − 2 Z 2
 − −
Figure 1: Two-Phase System
v 1 = Re Vejωt (3)
v 2 = Re −jV e jω t (4)
= Re Vej(ωt−π 2 ) (5)
 
 V
1
 
V
2
Figure 2: Phasor Diagram for Two-Phase Source
If each source is connected to a load with impedance:
Z = |Z|ejψ
then the complex amplitudes of currents are:
V
−jψ
I = e
1
|Z|
V
−jψe −j π
e
I 2 =
2
|Z|
Each of the two phase networks has the same value for real and reactive power:
|V |2
P + jQ = ejψ (6)
2|Z|
or:
|V |2
P = cosψ (7)
2|Z|
|V |2
Q = sinψ (8)
2|Z|
The relationship between “complex power” and instantaneous power flow was worked out in
Chapter 2 of these notes. For a system with voltage of the form:
v = Re Vejφejωt
 
instantaneous power is given by:
p = P [1+cos2(ωt + φ)]+Q sin2(ωt + φ)
For the case under consideration here, φ = 0 for phase 1 and φ = −π for phase 2. Thus:
2
|V |2 |V |2
p 1 = cosψ [1+cos2ωt]+ sinψ sin2ωt
2|Z| 2|Z|
|V |2 |V |2
p 2 = cosψ [1+cos(2ωt −π)]+ sinψ sin(2ωt −π)
2|Z| 2|Z|
Note that the time-varying parts of these two expressions have opposite signs. Added together,
they give instantaneous power:
|V |2
p = p 1 + p 2 = cosψ
|Z|
At least one of the advantages of polyphase power networks is now apparent. The use of a
balanced polyphase system avoids the power flow pulsations due to ac voltage and current, and
even the pulsations due to reactive energy flow. This has obvious benefits when dealing with
motors and generators or, in fact, any type of source or load which would like to see constant
power.
3 Three Phase Systems
Now consider the arrangement of three voltage sources illustrated in Figure 3.
The three phase voltages are:
v = V cosωt = Re Vejωt (9)
a
v b = V cos(ωt − 2 3 π ) = Re V ej(ωt − 2 3 π ) (10)
v c = V cos(ωt + 2 3 π ) = Re V ej(ωt+2 3 π ) (11)
 
These three phase voltages are illustrated in the time domain in Figure 4 and as complex
phasors in Figure 5. Note the symmetrical spacing in time of the voltages. As in earlier examples,
the instantaneousvoltagesmay be visualizedby imaginingFigure 5 spinning counterclockwisewith
+
+
v
+ c
v
 − + V ej 2 3 π − + V e −j 2 3 π − + V v a b
− − −
 
Figure 3: Three- Phase Voltage Source
1
0.8
0.6
0.4
0.2
cV
,bV
0
,aV
−0.2
−0.4
−0.6
−0.8
−1
0 5 10 15
t
Figure 4: Three Phase Voltages
angularvelocity ω. Theinstantaneousvoltagesarejustprojectionsof thevectorsof this “pinwheel”
onto the horizontal axis.
Consider connecting these three voltage sources to three identical loads, each with complex
impedance Z, as shown in Figure 6.
If voltages are as given by (9 - 11), then currents in the three phases are:
V
i = Re ejωt (12)
a
Z
 
i b = Re V ej(ωt−2 3 π ) (13)
Z
 
i c = Re V ej(ωt+2 3 π ) (14)
Z
 
V
c
 
 
 
 
 
V
 a
 
 
 
 
 
V 
b
Figure 5: Phasor Diagram: Three Phase Voltages
 
i i i
c b a
+ + +
 + v + v + v v v v
− a − b − c Z c Z b Z a
 − − −
i
 n
Figure 6: Three- Phase Source Connected To Balanced Load
Complex power in each of the three phases is:
|V |2
P + jQ = (cosψ + j sinψ) (15)
2|Z|
Then, remembering the time phase of the three sources, it is possible to write the values of instan­
taneous power in the three phases:
|V |2
p = {cosψ [1+cos2ωt]+sinψ sin2ωt} (16)
a
2|Z|
|V |2 2π 2π
p = cosψ 1+cos(2ωt − ) +sinψ sin(2ωt − ) (17)
b
2|Z| 3 3
 
|V |2 2π 2π
p = cosψ 1+cos(2ωt + ) + sinψ sin(2ωt + ) (18)
c
2|Z| 3 3
 
The sum of these three expressions is total instantaneous power, which is constant:
3 |V |2
p = p + p + p = cosψ (19)
a b c
2 |Z|
It is useful, in dealing with three phase systems, to remember that
2π 2π
cosx +cos(x − )+cos(x + ) = 0
3 3
regardless of the value of x.
Now consider the current in the neutral wire, i in Figure 6. This current is given by:
n
i n = i a + i b + i c = Re V e jωt + e j(ωt−2 3 π ) + e j(ωt+2 3 π) = 0 (20)
Z
 
This shows the most important advantage of three-phase systems over two-phase systems: a
wire with no current in it does not have to be very large. In fact, the neutral connection may
be eliminated completely in many cases. The network shown in Figure 7 will work as well as the
network in Figure 6 in most cases in which the voltages and load impedances are balanced.
v
a i a + v a −
 
− +
Z
 v 
b i b + v b −
 
− +
Z
 v 
c i c + v c −
 
− +
Z
 
Figure 7: Ungrounded Three-Phase Source and Load
There is a fundamental difference between grounded and undgrounded systems if perfectly
balanced conditions are not maintained. In effect, the ground wire provides isolation between the
phases by fixing the neutral voltage a the star point to be zero. If the load impedances are not
equal the load is said to be unbalanced. If the system is grounded there will be current in the
neutral. If an unbalanced load is not grounded, the star point voltage will not be zero, and the
voltages will be different in the three phases at the load, even if the voltage sources all have the
same magnitude.
4 Line-Line Voltages
A balanced three-phase set of voltages has a well defined set of line-line voltages. If the line-to­
neutral voltages are given by (9 - 11), then line-line voltages are:
v ab = v a −v b = Re V 1− e −j 2 3 π e jωt (21)
v bc = v b −v c = Re V e −j 2 3 π − e j 2 3 π e j ωt (22)
v ca = v c −v a = Re V e j 2 3 π −1 ejω t (23)
 
and these reduce to:
√
v ab = Re 3Vejπ 6 ejωt (24)
√
ejω t
 
−jπ
v bc = Re
3Ve
(25)
2
√
v ca = Re 3Vej 5 6 π ejωt (26)
 
Thephasorrelationship ofline-to-neutral andline-to-linevoltagesisshowninFigure8. Two things
should be noted about this relationship:
• The line-to-line voltage set has a magnitude that is larger than the line-ground voltage by a
√
factor of 3.
◦
• Line-to-line voltages are phase shifted by 30 ahead of line-to-neutral voltages.
Clearly,line-to-linevoltagesthemselvesformathree-phasesetjustasdoline-to-neutral voltages.
Power system components (sources, transformer windings, loads, etc.) may be connected either
between lines and neutral or between lines. The former connection of often called wye, the latter
is called delta, for obvious reasons.
V
c
V V
ca V ab
ca
V
c
V
a
V
a
V V
bc ab
V b V b
V
bc
Figure 8: Line-Neutral and Line-Line Voltages
It should be noted that the wye connection is at least potentially a four-terminal connection,
whilethe delta connectionisinherently three-terminal. Thedifferenceistheavailabilityof aneutral
point. Under balanced operating conditions this is unimportant, but the difference is apparent and
important under unbalanced conditions.
4.1 Example: Wye and Delta Connected Loads
Loads may be connected in either line-to-neutral or line-to-line configuration. An example of the
use of this flexibility is in a fairly commonly used distribution system with a line-to-neutral voltage
of 120 V, RMS. In this system the line-to-line voltage is 208 V, RMS. Single phase loads may be
connected either line-to-line or line-to-neutral.
+
V a - +
- V V
ca ab
- V + -
b
- +
V
+ c - V +
bc
Figure 9: Wye And Delta Connected Voltage Sources
a a
Z
a
Z Z
ca ab
Z
b
Z c b Z b
c c bc
Figure 10: Wye And Delta Connected Impedances
Suppose it is necessary to build a resistive heater to deliver 6 kW, to be made of three elements
which may be connected in either wye or delta. Each of the three elements must dissipate 2000 W.
V2
, the wye connected resistors would be:
Thus, since P =
R
1202
R = = 7.2Ω
y
2000
while the delta connected resistors would be:
2082
R Δ = = 21.6Ω
2000
As is suggested by this example, wye and delta connected impedances are often directly equiv­
alent. In fact, ungrounded connections are three-terminal networks which may be represented in
two ways. The two networks shown in Figure 10, combinations of three passive impedances, are
directly equivalent and identical in their terminal behavior if the relationships between elements
are as given in (27 - 32).
Z Z + Z Z + Z Z
Z = a b b c c a (27)
ab Z
c
Z Z + Z Z + Z Z
Z = a b b c c a (28)
bc Z
a
Z Z + Z Z + Z Z
Z = a b b c c a (29)
ca Z
b
Z Z
Z = ab ca (30)
a Z + Z + Z
ab bc ca
Z Z
Z = ab bc (31)
b Z + Z + Z
ab bc ca
Z Z
Z = bc ca (32)
c Z + Z + Z
ab bc ca
A special case of the wye-delta equivalence is that of balanced loads, in which:
Z = Z = Z = Z
a b c y
and
Z = Z = Z = Z
ab bc ca Δ
in which case:
Z = 3Z
Δ y
4.2 Example: Use of Wye-Delta for Unbalanced Loads
The unbalanced load shown in Figure 11 is connected to a balanced voltage source. The problem
is to determine the line currents. Note that his load is ungrounded (if it were grounded, this would
be a trivial problem). The voltages are given by:
v = V cosωt
a
2π
v = V cos(ωt − )
b
3
2π
v = V cos(ωt + )
c
3
To solve this problem, convert both the source and load to delta equivalent connections, as
shown in Figure 12. The values of the three resistors are:
2+4+2
r = r = = 4
ab ca
2
2+4+2
r = = 8
bc
1
The complex amplitudes of the equivalent voltage sources are:
√
jπ
−j 2
π
V = V −V = V 1−e
= V 3e
6
3
ab a b
√
V = V −V = V e − j 2 3 π − e j 2 3 π = V 3e −jπ 2
bc b c
√
V = V −V = V e j 2 3 π −1 = V 3e j 5 6 π
ca c a
 
I
a
+
V R = 1
a a
-
- -
V c V b R b = 2 R c = 2
+
+ I
b
I
c
Figure 11: Unbalanced Load
-
+ I
a
V
ca V R = 4
ca
ab R = 4
+ ab
-
I
- + b R = 8
V bc
bc
I
c
Figure 12: Delta Equivalent
Currents in each of the equivalent resistors are:
V V V
I = ab I = bc I = ca
1 2 3
r r r
ab bc ca
The line curents are then just the difference between current in the legs of the delta:
I a = I 1 −I 3 = √ 3V e j 4 π 6 − e j 4 5 6 π = 3 4 V
 
I b = I 2 −I 1 = √ 3V e − 8 j π 2 − e j 4 π 6 = − 3 8 + j 1 4 V
 
I c = I 3 −I 2 = √ 3V e j 4 5 6 π − e − 8 j π 2 = − 8 3 −j 4 1 V
 
These are shown in Figure 13.
Im(·)
1V
 4
 
 
3V 
3V
−
 
8 4
 
 
 Re(·)
 
 
 
 − 1V
4
Figure 13: Line Currents
5 Transformers
Transformers are essential parts of most power systems. Their role is to convert electrical energy
at one voltage to some other voltage. We will deal with transformers as electromagnetic elements
lateroninthissubject, butfornowit willbesufficienttouseasimplified modelforthetransformer
which we will call the ideal transformer. This is a two-port circuit element, shown in Figure 14.
i i
 1 2
N 1 : N 2
+ +
⊃ ⊂
v ⊃ ⊂ v
1 ⊃ ⊂ 2
⊃ ⊂
− −
Figure 14: Ideal Transformer
The ideal transformer as a network element constrains its terminal variables in the following
way:
v v
1 2
= (33)
N N
1 2
N 1 i 1 = −N 2 i 2 (34)
As it turns out, this is not a terribly bad model for the behavior of a real transformer under
most circumstances. Of course, we will be interested in fine points of transformer behavior and
behavior under pathological operating conditions, and so will eventually want a better model. For
now, it is sufficient to note just a few things about how the transformer works.
1. In normal operation, we select a transformer turns ratio N1 so that the desired voltages
N2
appear at the proper terminals. For example, to convert 13.8 kV distribution voltage to the
120/240 volt level suitable for residential or commercial single phase service, we would use a
transformer with turns ratio of 13800 = 57.5. To split the low voltage in half, a center tap on
240
the low voltage winding would be used.
2. The transformer, at least in its ideal form, does not consume, produce nor store energy. Note
that, according to (33) and (34), the sum of power flows into a transformer is identically zero:
p 1 + p 2 = v 1 i 1 + v 2 i 2 = 0 (35)
3. The transformer also tends to transform impedances. To show how this is, look at Figure 15.
Here, some impedance is connected to one side of an ideal transformer. See that it is possible
to find an equivalent impedance viewed from the other side of the transformer.
I I
 1 2
N 1 : N 2
+
⊃ ⊂
V ⊃ ⊂ Z
1 ⊃ ⊂
⊃ ⊂
−
Figure 15: Impedance Transformation
Noting that
N
1
I = − I
2 1
N
2
and that
V = −ZI
2 2
Then the ratio between input voltage and current is:
N N 2
1 1
V = V = I (36)
1 2 1
N N
2 2
 
6 Three-Phase Transformers
A three-phase transformer is simply three single phase transformers. The complication in these
thingsisthattherearea numberof waysof winding them, and anumberof ways ofinterconnecting
them. We will have more to say about windings later. For now, consider interconnections. On
either “side” of a transformer connection (i.e. the high voltage and low voltage sides), it is possible
to connect transformer windings either line to neutral (wye), or line to line (delta). Thus we may
speak of transformer connections being wye-wye, delta-delta, wye-delta, or delta-wye.
Ignoring certain complicationsthat we will have more to say about shortly, connection of trans­
formersineitherwye-wye or delta-delta isreasonablyeasytounderstand. Eachoftheline-to-neutral
(in the case of wye-wye), or line-to-line (in the case of delta-delta) voltages is transformed by one
of the three transformers. On the other hand, the interconnections of a wye-delta or delta-wye
transformer are a little more complex. Figure 16 shows a delta-wye connection, in what might be
called “wiring diagram” form. A more schematic (and more common) form of the same picture is
shown in Figure 17. In that picture, winding elements that appear parallel are wound on the same
core segment, and so constitute a single phase transformer.
X H X H X H
c c b b a a
 
 
⊃ ⊂ ⊃ ⊂ ⊃ ⊂
⊃ ⊂ ⊃ ⊂ ⊃ ⊂
⊃ ⊂ ⊃ ⊂ ⊃ ⊂
⊃ ⊂ ⊃ ⊂ ⊃ ⊂
 
Figure 16: Delta-Wye Transformer Connection
Now: assume that N Δ and N Y are numbers of turns. If the individual transformers are consid­
ered to be ideal, the following voltage and current constraints exist:
N
Y
v aY = (v aΔ −v bΔ) (37)
N
Δ
N
Y
v bY = (v bΔ −v cΔ) (38)
N
Δ
N
Y
v cY = (v cΔ −v aΔ) (39)
N
Δ
N
Y
i aΔ = (i aY −i cY ) (40)
N
Δ
N
Y
i bΔ = (i bY −i aY ) (41)
N
Δ
N
Y
i cΔ = (i cY −i bY ) (42)
N
Δ
A
A Y
N
N
Y
C N
N
Y
N
N
Y
B C
Y B
Y
Figure 17: Schematic of Delta-Wye Transformer Connection
where each of the voltages are line-neutral and the currents are in the lines at the transformer
terminals.
Now, consider what happens if a Δ−Y transformer is connected to a balanced three- phase
voltage source, so that:
v aΔ = Re Vejωt
v bΔ = Re V ej(ωt − 2 3 π )
ej(ωt+2
 
π ) 
v cΔ = Re
V
3
 
Then, complex amplitudes on the wye side are:
V = NY V 1− e −j 2 3 π = √ 3 N Y Vej π 6
aY NΔ N
Δ
V = NY V e − j 2 3 π −ej 2 3 π = √ 3 N Y Ve −j π 2
bY NΔ N
Δ
V = NY V ej 2 3 π −1 = √ 3 N Y Vej 5 6 π
cY NΔ N
Δ
 
Two observations should be made here:
• The ratio of voltages (that is, the ratio of either line-line or line-neutral) is different from the
√
turns ratio by a factor of 3.
◦
• All wye side voltages are shifted in phase by 30 with respect to the delta side voltages.
6.1 Example
Suppose we have the following problem to solve:
A balanced three- phase wye-connected resistor is connected to the Δ side of a Y −Δ
transformer with a nominal voltage ratio of
v
Δ
= N
v
Y
What is the impedance looking into the wye side of the transformer, assuming drive
with a balanced source?
The situation is shown in Figure 18.
N
N
Y R
N
N
Y
N
R R
N
Y
Figure 18: Example
It is important to remember the relationship between the voltage ratio and the turns ratio,
which is:
v N
Δ Δ
= N = √
v Y 3N Y
so that:
N N
δ
= √
N Y 3
Next, the Y −Δ equivalent transform for the load makes the picture look like figure 19
Inthissituation,eachtransformersecondary windingisconecteddirectly acrossoneof thethree
resistors. Currents in the resistors are given by:
v
abΔ
i 1 =
3R
v
bcΔ
i 2 =
3R
v
caΔ
i 3 =
3R
Line currents are:
i aΔ = i 1 −i 3 = vabΔ 3 − R v caΔ = i 1Δ −i 3Δ
i bΔ = i 2 −i 1 = vbcΔ 3 − R v abΔ = i 2Δ −i 1Δ
i cΔ = i 3 −i 2 = vcaΔ 3 − R v bcΔ = i 3Δ −i 2Δ
i
a
i
aY
i
+ N 3
3R
N v −
Y a − Y + v ca + 3R
− v v ab N
N Y − v bc +− i 2 3R i 1
bY + N
− i
v N b
+ cY Y i c
i i
cY bY
Figure 19: Equivalent Situation
SolvingforcurrentsinthelegsofthetransformerΔ,subtract,forexample,thesecondexpression
from the first:
−v
−v
2v
caΔ
abΔ
bcΔ
2i 1Δ −i 2Δ −i 3Δ =
3R
Now, taking advantage of the fact that the system is balanced:
i 1Δ + i 2Δ + i 3Δ = 0
v abΔ + v bcΔ + v caΔ = 0
to find:
v
abΔ
i 1Δ =
3R
v
bcΔ
i 2Δ =
3R
v
caΔ
i 3Δ =
3R
Finally, the ideal transformer relations give:
N N
Δ Δ
v abΔ = v aY i aY = i 1Δ
N N
Y Y
N N
Δ Δ
v bcΔ = v bY i bY = i 2Δ
N N
Y Y
N N
Δ Δ
v caΔ = v cY i cY = i 3Δ
N N
Y Y
so that:
N Δ 2 1
i = v
aY aY
N 3R
 Y 
N Δ 2 1
i = v
bY bY
N 3R
 Y 
N Δ 2 1
i = v
cY cY
N 3R
 Y 
The apparent resistance (that is, apparent were it to be connected in wye) at the wye terminals
of the transformer is:
N 2
Y
R = 3R
eq
N
Δ
 
Expressed in terms of voltage ratio, this is:
N 2 v 2
Y
R = 3R √ = R
eq
3 v Δ
 
It is important to note that this solution took the long way around. Taken consistently (uni­
formlyonaline-neutral oruniformly onaline-linebasis),impedancestransformacrosstransformers
by the square of the voltage ratio, no matter what connection is used.
7 Polyphase Lines and Single-Phase Equivalents
By now, one might suspect that a balanced polyphase system may be regarded simply as three
single-phase systems, even though the three phases are physically interconnected. This feeling is
reinforced by the equivalence between wye and delta connected sources and impedances. One more
step is required to show that single phase equivalence is indeed useful, and this concerns situations
in which the phases have mutual coupling.
In speaking of lines, we mean such system elements as transmission or distribution lines: over­
head wires, cables or even in-plant buswork. Such elements have impedance, so that there is some
voltage drop between the sending and receiving ends of the line. This impedance is more than just
conductor resistance: the conductors have both self and mutual inductance, because currents in
the conductors make magnetic flux which, in turn, is linked by all conductors of the line.
A schematic view of a line is shown in Figure 20. Actually, only the inductance components of
line impedance are shown, since they are the most interesting parts of line impedance. Working in
complex amplitudes, it is possible to write the voltage drops for the three phases by:
V −V = jωLI + jωM (I + I ) (43)
a1 a2 a b c
V −V = jωLI + jωM (I + I ) (44)
b1 b2 b a c
V −V = jωLI + jωM (I + I ) (45)
c1 c2 c a b
If the currents form a balanced set:
I + I + I = 0 (46)
a b c
Then the voltage drops are simply:
V −V = jω (L −M)I
a1 a2 a
V −V = jω (L −M)I
b1 b2 b
V −V = jω (L −M)I
c1 c2 c
L
v v
a1 a2
i
a M
L
v
v
b1 b2
i
b M M
L
v v
c1 c2
i
c
Figure 20: Schematic Of A Balanced Three-Phase Line With Mutual Coupling
+ L
R
N
V a NY L M
R
-
N
- V NY L M M
b
- + N R
+ V c N Y
Voltage Source Primary Secondary Transmission Line Load
Transformer
Figure 21: Example
In this case, an apparent inductance, suitable for the balanced case, has been defined:
L 1 = L −M (47)
which describes the behavior of one phase in terms of its own current. It is most important to note
that this inductance is a valid description of the line only if (46) holds, which it does, of course, in
the balanced case.
7.1 Example
To show how the analytical techniques which come from the network simplification resulting from
single phase equivalents and wye-delta transformations, consider the following problem:
A three-phase resistive load is connected to a balanced three-phase source through a
transformer connected in delta-wye and a polyphase line, as shown in Figure 21. The
problem is to calculate power dissipated in the load resistors. The three- phase voltage
source has:
√
v = Re 2V ejωt
a RMS
√
v b = Re 2V RMS ej(ωt − 2 3 π )
√
ej(ωt+2
 
π ) 
v c = Re
2V RMS
3
 
This problem is worked by a succession of simple transformations. First, the delta connected
resistive load is converted to its equivalent wye with R = R .
Y 3
Next, since the problem is balanced, the self- and mutual inductances of the line are directly
equivalent to self inductances in each phase of L 1 = L −M.
Now, the transformer secondary is facing an impedance in each phase of:
Z Ys = jωL 1 + R Y
The delta-wye transformer has a voltage ratio of:
v N
p Δ
= √
v s 3N Y
so that, on the primary side of the transformer, the line and load impedance is:
Z = jωL + R
p eq eq
where the equivalent elements are:
1 N Δ 2
L = (L −M)
eq
3 N
 Y 
1 N Δ 2 R
R =
eq
3 N 3
 Y 
Magnitude of current flowing in each phase of the source is:
√
2V
RMS
|I| =
(ωL ) 2 + R2
eq eq
 
Dissipation in one phase is:
1
P 1 = |I| 2R eq
2
V 2 R
= RMS eq
(ωL ) 2 + R2
eq eq
And, of course, total power dissipated is just three times the single phase dissipation.
8 Introduction To Per-Unit Systems
Strictly speaking, per-unit systems are nothing more than normalizations of voltage, current,
impedance and power. These normalizations of system parameters because they provide sim­
plifications in many network calculations. As we will discover, while certain ordinary parameters
have very wide ranges of value, the equivalent per-unit parameters fall in a much narrower range.
This helps in understanding how certain types of system behave.
 
i
1
+
 + − V Z v 1
 −
Figure 22: Example
8.1 Normalization Of Voltage And Current
The basis for the per-unit system of notation is the expression of voltage and current as fractions
of base levels. Thus the first step in setting up a per-unit normalization is to pick base voltage and
current.
Consider the simple situation shown in Figure 22. For this network, the complex amplitudes
of voltage and current are:
V = IZ (48)
We start by defining two base quantities, V for voltage and I for current. In many cases, these
B B
will be chosen to be nominal or rated values. For generating plants, for example, it is common to
use the rated voltage and rated current of the generator as base quantities. In other situations,
such as system stability studies, it is common to use a standard, system wide base system.
The per-unit voltage and current are then simply:
V
v = (49)
V
B
I
i = (50)
I
B
Applying (49) and (50) to (48), we find:
v = iz (51)
where the per-unit impedance is:
I
B
z = Z (52)
V
B
This leads to a definition for a base impedance for the system:
V
B
Z = (53)
B
I
B
Of course there is also a base power, which for a single phase system is:
P = V I (54)
B B B
aslong as V and I areexpressedinRMS.Itisinteresting tonotethat, aslong asnormalizationis
B B
carried out in a consistent way, there is no ambiguity in per-unit notation. That is, peak quantities
normalized to peak base quantities will be the same, in per-unit, as RMS quantities normalized to
RMS bases. This advantage is even more striking in polyphase systems, as we are about to see.
8.2 Three Phase Systems
When describing polyphase systems, we have the choice of using either line-line or line-neutral
voltage and line current or current in delta equivalent loads. In order to keep straight analysis in
ordinary variable, itisnecessary tocarry alonginformationabout which of thesequantitiesisbeing
used. There is no such problem with per-unit notation.
We may use as base quantities either line to neutral voltage V Bl−g or line to line voltage V Bl−l .
Taking the base current to be line current I , we may express base power as:
Bl
P B = 3V Bl−g I Bl (55)
√
Becauseline-linevoltageis,undernormaloperation, 3timesline-neutralvoltage,anequivalent
statement is:
√
P B = 3V Bl−l I Bl (56)
If base impedance is expressed by line-neutral voltage and line current (This is the common
convention, but is not required),
V Bl−g
Z = (57)
B
I
Bl
Then, base impedance is, written in terms of base power:
Z = P B = 3 V B 2 l−g = V B 2 l−l (58)
B 3I2 P P
B B B
Note that a single per-unit voltage applied equally well to line-line, line-neutral, peak and RMS
quantities. For a given situation, each of these quantities will have a different ordinary value, but
there is only one per-unit value.
8.3 Networks With Transformers
One of the most important advantages of the use of per-unit systems arises in the analysis of
networks with transformers. Properly applied, a per-unit normalization will cause nearly all ideal
transformers to dissapear from the per-unit network, thus greatly simplifying analysis.
To show how this comes about, consider the ideal transformer as shown in Figure 23. The
I I
 1 2
1 : N
+ +
⊃ ⊂
V ⊃ ⊂ V
1 ⊃ ⊂ 2
⊃ ⊂
− −
Figure 23: Ideal Transformer With Voltage And Current Conventions Noted
ideal transformer imposes the constraints that:
V = NV
2 1
1
I = I
2 1
N
Normalized to base quantities on the two sides of the transformer, the per-unit voltage and
current are:
V
1
v =
1
V
B1
I
1
i =
1
I
B1
V
2
v =
2
V
B2
I
2
i =
2
I
B2
Now: note that if the base quantities are related to each other as if they had been processed by the
transformer:
V B2 = NV B1 (59)
I
B1
I B2 = (60)
N
then v = v and i = i , as if the ideal transformer were not there (that is, consisted of an ideal
1 2 1 2
wire).
Expressions(59) and(60) reflect ageneral ruleinsetting upper-unit normalizationsforsystems
with transformers. Each segment of the system should have the same base power. Base voltages
transform according to transformer voltage ratios. For three-phase systems, of course, the voltage
√
ratiosmaydifferfromthephysicalturnsratiosby afactorof 3ifdelta-wye or wye-delta connections
are used. It is, however, the voltage ratio that must be used in setting base voltages.
8.4 Transforming From One Base To Another
Very often data such as transformer leakage inductance is given in per-unit terms, on some base
(perhaps the units rating), while in order to do a system study it is necessary to express the same
data in per-unit in some other base (perhaps a unified system base). It is always possible to do this
by the two step process of converting the per-unit data to its ordinary form, then re-normalizing it
in the new base. However, it is easier to just convert it to the new base in the following way.
Note that impedance in Ohms (ordinary units) is given by:
Z = z 1 Z B1 = z 2 Z B2 (61)
Here, of course, z and z are the same per-unit impedance expressed in different bases. This could
1 2
be written as:
V 2 V 2
z B1 = z B2 (62)
1 2
P P
B1 B2
This yields a convenient rule for converting from one base system to another:
P V 2
B1 B2
z = z (63)
1 2
P V
B2
B1
 
 
Load
G T L T
1 1 2
3-Phase
Fault
Figure 24: One-Line Diagram Of Faulted System
8.5 Example: Fault Study
Toillustratesomeoftheconceptswithwhich wehavebeendealing,wewilldoashort circuit analysis
of a simple power system. This system is illustrated, in one-line diagram form, in Figure 24.
A one-line diagram is a way of conveying a lot of information about a power system without
becoming cluttered with repetitive pieces of data. Drawing all three phases of a system would
involve quite a lot of repetition that is not needed for most studies. Further, the three phases can
be re-constructed from the one-line diagram if necessary. It is usual to use special symbols for
different components of the network. For our network, we have the following pieces of data:
Symbol Component Base P Base V Impedance
(MVA) (kV) (per-unit)
G 1 Generator 200 13.8 j.18
T 1 Transformer 200 13.8/138 j.12
L 1 Trans. Line 100 138 .02+j.05
T 2 Transformer 50 138/34.5 j.08
A three-phase fault is assumed to occur on the 34.5 kV side of the transformer T 2. This is
a symmetrical situation, so that only one phase must be represented. The per-unit impedance
diagram is shown in Figure 25. It is necessary to proceed now to determine the value of the
components in this circuit.
x g x T 1 x l r l x T 2
∩∩∩∩ ∩∩∩∩ ∩∩∩∩ ∧∧∧ ∩∩∩∩ 
∨∨
 + e
− g
 
 
Figure 25: Impedance Diagram For Fault Example
First, it is necessary to establish a uniform base an per-unit value for each of the system
components. Somewhat arbitrarily, we choose as the base segment the transmission line. Thus all
of the parameters must be put into a base power of 100 MVA and voltage bases of 138 kV on the
line, 13.8 kV at the generator, and 34.5 kV at the fault. Using (62):
x = 100 ×.18 = .09per-unit
g 200
x T 1 = 1 2 0 0 0 0 ×.12 = .06per-unit
x T 2 = 1 5 0 0 0 ×.08 = .16per-unit
r = = .02per-unit
l
x = = .05per-unit
l
Total impedance is:
z = j (x g + x T 1 + x l + x T 2)+r l
= j.36+.02per-unit
|z| = .361per-unit
Now, if e is equal to one per-unit (generator internal voltage equal to base voltage), then the
g
per-unit current is:
1
|i| = = .277per-unit
.361
This may be translated back into ordinary units by getting base current levels. These are:
• On the base at the generator:
100MVA
I = √ = 4.18kA
B
3×13.8kV
• On the line base:
100MVA
I = √ = 418A
B
3×138kV
• On the base at the fault:
100MVA
I = √ = 1.67kA
B
3×34.5kV
Then the actual fault currents are:
• At the generator |I | = 11, 595A
f
• On the transmission line |I | = 1159A
f
• At the fault |I | = 4633A
f
Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes Chapter 4
Introduction To Symmetrical Components ∗
J.L. Kirtley Jr.
1 Introduction
Installment 3 of these notes dealt primarily with networks that are balanced, in which the three
◦
voltages (and three currents) are identical but for exact 120 phase shifts. Unbalanced conditions
may arise from unequal voltage sources or loads. It is possible to analyze some simple types
of unbalanced networks using straightforward solution techniques and wye-delta transformations.
However, power networks can be come quite complex and many situations would be very difficult
tohandleusing ordinary network analysis. Forthisreason, atechniquewhich hascometobecalled
symmetrical components has been developed.
Symmetrical components, in addition to being a powerful analytical tool, is also conceptually
useful. The symmetrical components themselves, which are obtained from a transformation of the
ordinary line voltages and currents, are useful in their own right. Symmetrical components have
become accepted as one way of describing the properties of many types of network elements such
as transmission lines, motors and generators.
2 The Symmetrical Component Transformation
The basis for this analytical technique is a transformation of the three voltages and three currents
intoasecondset of voltagesand currents. Thissecondsetisknownasthe symmetrical components.
Working in complex amplitudes:
v = Re V ejωt (1)
a a
v b = Re V b ej(ωt − 2 3 π ) (2)
ej(ωt+ 2
 
π ) 
v c = Re
V c
(3)
3
 
∗ c2003 James L. Kirtley Jr.
The transformation is defined as:
V 1 a a2 V
1 1 a
V = 1 a2 a V (4)
⎡ 2 ⎤ ⎡ ⎤⎡ b ⎤
3
V 1 1 1 V
0 c
⎢ ⎥ ⎢ ⎥⎢ ⎥
⎣ ⎦ ⎣ ⎦⎣ ⎦
where the complex number a is:
√
a = ej 2 3 π = − 1 +j 3 (5)
2 2
√
a2 = ej 4 3 π = e −j 2 3 π = − 1 −j 3 (6)
2 2
a3
= 1 (7)
This transformation may be used for both voltage and current, and works for variables in
ordinary form as well as variables that have been normalized and are in per-unit form. The inverse
of this transformation is:
V 1 1 1 V
a 1
V = a2 a 1 V (8)
⎡ b ⎤ ⎡ ⎤⎡ 2 ⎤
V a a2 1 V
c 0
⎢ ⎥ ⎢ ⎥⎢ ⎥
⎣ ⎦ ⎣ ⎦⎣ ⎦
The three component variables V , V , V are called, respectively, positive sequence, negative
1 2 0
sequence and zero sequence. They are called symmetrical components because, taken separately,
they transform into symmetrical sets of voltages. The properties of these components can be
demonstrated by tranforming each one back into phase variables.
Consider first the positive sequence component taken by itself:
V = V (9)
1
V = 0 (10)
2
V = 0 (11)
0
yields:
V = V or v = V cosωt (12)
a a
2π
2
V = a V or v = V cos(ωt− ) (13)
b b
3
2π
V = aV or v = V cos(ωt+ ) (14)
c c
3
◦
This is the familiar balanced set of voltages: Phase b lags phase a by 120 , phase c lags phase
b and phase a lags phase c.
The same transformation carried out on a negative sequence voltage:
V = 0 (15)
1
V = V (16)
2
V = 0 (17)
0
yields:
V = V or v = V cosωt (18)
a a
2π
V = aV or v = V cos(ωt+ ) (19)
b b
3
2π
V = a 2V or v = V cos(ωt− ) (20)
c c
3
This is called negative sequence because the sequence of voltages is reversed: phase b now leads
phase a rather than lagging. Note that the negative sequence set is still balanced in the sense
◦
that the phase components still have the same magnitude and are separated by 120 . The only
difference between positive and negative sequence is the phase rotation. This is shown in Figure 1.
V V
c b
 
 
 
 
 
V V
 a a
 
 
 
 
 
V V 
b c
Positive Sequence Negative Sequence
Figure 1: Phasor Diagram: Three Phase Voltages
The third symmetrical component is zero sequence. If:
V = 0 (21)
1
V = 0 (22)
2
V = V (23)
0
Then:
V = V or v = V cosωt (24)
a a
V = V or v = V cosωt (25)
b b
V = V or v = V cosωt (26)
c c
That is, all three phases are varying together.
Positive and negative sequence sets contain those parts of the three-phase excitation that rep­
resent balanced normal and reverse phase sequence. Zero sequence is required to make up the
difference between the total phase variables and the two rotating components.
The great utility of symmetrical components is that, for most types of network elements, the
symmetrical componentsareindependent of each other. Inparticular,balancedimpedancesand ro­
tating machineswill draw only positive sequencecurrents inresponse to positivesequence voltages.
It is thus possible to describe a network in terms of sub-networks, one for each of the symmetrical
components. These are called sequence networks. A completely balanced network will have three
entirely separate sequence networks. If a network is unbalanced at a particular spot, the sequence
networkswillbeinterconnected atthat spot. Thekeytouseofsymmetrical componentsinhandling
unbalanced situations is in learning how to formulate those interconnections.
3 Sequence Impedances
Many different types of network elements exhibit different behavior to the different symmetrical
components. Forexample,aswewill seeshortly, transmissionlineshaveoneimpedanceforpositive
and negative sequence, but an entirely different impedance to zero sequence. Rotating machines
have different impedances to all three
Positive Sequence Negative Sequence
Figure 2: Sequence Connections For A Line-To-Line Fault
sequences.
To illustrate the independence of symmetrical components in balanced networks, consider the
transmission line illustrated back in Figure 20 of Installment 3 of these notes. The expressions for
voltage drop in the lines may be written as a single vector expression:
V −V = jωL I (27)
ph1 ph2 ph ph
where
V
a
V = V (28)
ph ⎡ b ⎤
V
c
⎢ ⎥
⎣ ⎦
I
a
I = I (29)
ph ⎡ b ⎤
I
c
⎢ ⎥
⎣ ⎦
L M M
L = M L M (30)
ph ⎡ ⎤
M M L
⎢ ⎥
⎣ ⎦
Note that the symmetrical component transformation (4) may be written in compact form:
V = TV (31)
s p
where
1 a a2
1
T = 1 a2 a (32)
⎡ ⎤
3
1 1 1
⎢ ⎥
and V is the vector of sequence voltages: ⎣ ⎦
s
V
1
V = V (33)
s ⎡ 2 ⎤
V
0
⎢ ⎥
⎣ ⎦
Rewriting (27) using the inverse of (31):
−1V
−1V
−1I
T
−T
= jωL T
(34)
s1 s2 ph s
Then transforming to get sequence voltages:
−1I
V −V = jωTL T
(35)
s1 s2 ph s
The sequence inductance matrix is defined by carrying out the operation indicated:
−1
L = TL T
(36)
s ph
which is:
L−M 0 0
L = 0 L−M 0 (37)
s ⎡ ⎤
0 0 L+2M
⎢ ⎥
Thusthecoupled set of expressionswh⎣i chdescribed thetransmissio⎦n linein phase variablesbecomes
an uncoupled set of expressions in the symmetrical components:
V −V = jω(L−M)I (38)
11 12 1
V −V = jω(L−M)I (39)
21 22 2
V −V = jω(L+2M)I (40)
01 02 0
The positive, negative and zero sequence impedances of the balanced transmission line are then:
Z = Z = jω(L−M) (41)
1 2
Z = jω(L+2M) (42)
0
So, in analysis of networks with transmission lines, it is now possible to replace the lines with three
independent, single- phase networks.
Consider next a balanced three-phase load with its neutral connected to ground through an
impedance as shown in Figure 3.
The symmetrical component voltage-current relationship for this network is found simply, by
assuming positive, negative and zero sequence currents and finding the corresponding voltages. If
this is done, it is found that the symmetrical components are independent, and that the voltage-
current relationships are:
V = ZI (43)
1 1
V = ZI (44)
2 2
V = (Z +3Z )I (45)
0 g 0
a
Z
Z
g
Z Z
c b
Figure 3: Balanced Load With Neutral Impedance
4 Unbalanced Sources
Consider the network shown in Figure 4. A balanced three-phase resistor is fed by a balanced
line (with mutual coupling between phases). Assume that only one phase of the voltage source is
working, so that:
V = V (46)
a
V = 0 (47)
b
V = 0 (48)
c
The objective of this example is to find currents in the three phases.
L
+
V L M R
a
V - - R
c
+ - L M M
V b + R
Figure 4: Balanced Load, Balanced Line, Unbalanced Source
To start, note that the unbalanced voltage source has the following set of symmetrical compo­
nents:
V
V = (49)
1
3
V
V = (50)
2
3
V
V = (51)
0
3
Next, the network facing the source consists of the line, with impedances:
Z = jω(L−M) (52)
1
Z = jω(L−M) (53)
2
Z = jω(L+2M) (54)
0
and the three- phase resistor has impedances:
Z = R (55)
1
Z = R (56)
2
Z = ∞ (57)
0
Note that the impedance to zero sequence is infinite because the neutral is not connected back
to the neutral of the voltage source. Thus the sum of line currents must always be zero and this
in turn precludes any zero sequence current. The problem is thus described by the networks which
appear in Figure 5.
jω(L−M) jω(L−M) jω(L+2M)
R
∩∩∩∩ ∩∩∩∩ ∩∩∩∩ ∧∧∧
∨∨
 + V < > + V < > + V
< R < R
> − 3
> − 3
− 3
<
<
 
Positive Negative Zero
Figure 5: Sequence Networks
Currents are:
V
I =
1
3(jω(L−M)+R)
V
I =
2
3(jω(L−M)+R)
I = 0
0
Phase currents may now be re-assembled:
I = I + I + I
a 1 2 0
I = a2 I + aI + I
b 1 2 0
I = aI + a2 I + I
c 1 2 0
or:
2V
I =
a 3(jω(L−M)+R)
(a2 + a)V
I =
b 3(jω(L−M)+R)
−V
=
3(jω(L−M)+R)
(a + a2)V
I =
c 3(jω(L−M)+R)
−V
=
3(jω(L−M)+R)
(Note that we have used a2 + a = −1).
5 Rotating Machines
Some network elements are more readily represented by sequence networks than by ordinary phase
networks. This is the case, for example, for synchronous machines. synchronous motors and
generators produce a positive sequence internal voltage and have terminal impedance. For reasons
which are beyond the scope of these notes, the impedance to positive sequence currents is not the
same as the impedance to negative or to zero sequence currents. A phase-by-phase representation
will not, in many situations, be adequate, but a sequence network representation will. Such a
representation is three Thevenin equivalent circuits, as shown in Figure 6
jX 1 I 1 jX 2 I 2 jX 0 I 0
∩∩∩∩ ∩∩∩∩ ∩∩∩∩
+ + +
 + 
E V V V
− 1 1 2 0
− − −
 
Positive Negative Zero
Figure 6: Sequence Networks For A Synchronous Machine
6 Transformers
Transformers provide some interesting features in setting up sequence networks. The first of these
arises from the fact that wye-delta or delta-wye transformer connections produce phase shifts from
◦
primary to secondary. Depending on connection, this phase shift may be either plus or minus 30
from primary to secondary for positive sequence voltages and currents. It is straightforward to
show that negative sequence shifts in the opposite direction from positive. Thus if the connection
advances positive sequence across the transformer, it retards negative sequence. This does not
turn out to affect the setting up of sequence networks, but does affect the re-construction of phase
currents and voltages.
A second important feature of transformers arises because delta and ungrounded wye connec­
tions are open circuits to zero sequence at their terminals. A delta connected winding, on the
other hand, will provide a short circuit to zero sequence currents induced from a wye connected
winding. Thus the zero sequence network of a transformermay take one of severalforms. Figures 7
through 9 show the zero sequence networks for various transformer connections.
X
l
∩∩∩∩
Figure 7: Zero Sequence Network: Wye-Wye Connection, Both Sides Grounded
⊃
⊃X
⊃ l
⊃
Figure 8: Zero Sequence Network: Wye-Delta Connection, Wye Side (Left) Grounded
7 Unbalanced Faults
A very common application of symmetrical components is in calculating currents arising from
unblanced short circuits. For three-phase systems, the possible unbalanced faults are:
1. Single line-ground,
2. Double line-ground,
3. Line-line.
These are considered separately.
7.1 Single Line-To-Ground Fault
The situation is as shown in Figure 10
The system in this case consists of networks connected to the line on which the fault occurs.
The point of fault itself consists of a set of terminals (which we might call “a,b,c”). The fault sets,
Figure 9: Zero Sequence Network: Wye-Delta Connection, Ungrounded or Delta-Delta
Point Of Fault
 
 

| | |
| --- | --- |

Network Network
Figure 10: Schematic Picture Of A Single Line-To-Ground Fault
at this point on the system:
V = 0
a
I = 0
b
I = 0
c
Now: using the inverse of the symmetrical component transformation, we see that:
V + V + V = 0 (58)
1 2 0
And using the transformation itself:
1
I = I = I = I (59)
1 2 0 a
3
Together, these two expressions describe the sequence network connection shown in Figure 11.
This connection has all three sequence networks connected in series.
7.2 Double Line-To-Ground Fault
If the fault involves phases b, c, and ground, the “terminal” relationship at the point of the fault
is:
V = 0
b
V = 0
c
I = 0
a
Then, using the sequence transformation:
1
V = V = V = V
1 2 0 a
3
Combining the inverse transformation:
I = I + I + I = 0
a 1 2 0
These describe a situation in which all three sequence networks are connected in parallel, as
shown in Figure 12.
I
1
+
Positive
V
Sequence 1
-
I
2
+
Negative
V
Sequence 2
-
I
0
+
Zero
V
Sequence 0
-
Figure 11: Sequence Connection For A Single-Line-To-Ground Fault
I I I
1 2 0
+ + +
Positive Negative
V 1 V Zero V
Sequence Sequence 2 Sequence 0
- - -
Figure 12: Sequence Connection For A Double-Line-To-Ground Fault
7.3 Line-Line Fault
If phases b and c are shorted together but not grounded,
V = V
b c
I = −I
b c
I = 0
a
Expressing these in terms of the symmetrical components:
V = V
1 2
1
= a + a2 V
b
3
I = I + I + I
0 a b c
= 0
I = I + I
a 1 2
= 0
Theseexpressionsdescribeaparallel connectionof thepositiveand negativesequencenetworks,
as shown in Figure 13.
I I
1 2
+ +
Positive Negative
Sequence V 1 Sequence V 2
- -
Figure 13: Sequence Connection For A Line-To-Line Fault
7.4 Example Of Fault Calculations
In this example, the objective is to determine maximum current through the breaker B due to a
fault atthelocationshowninFigure14. All threetypesof unbalancedfault,aswell asthebalanced
fault are to be considered. This is the sort of calculation that has to be done whenever a line is
installed or modified, so that protective relaying can be set properly.
T T
1 2
L L
1 2
Fault
Figure 14: One-Line Diagram For Example Fault
Parameters of the system are:
System Base Voltage 138 kV
System Base Power 100 MVA
Transformer T 1 Leakage Reactance .1 per-unit
Transformer T 2 Leakage Reactance .1 per-unit
Line L 1 Positive And Negative Sequence Reactance j.05 per-unit
Line L 1 Zero Sequence Impedance j.1 per-unit
Line L 2 Positive And Negative Sequence Reactance j.02 per-unit
Line L 2 Zero Sequence Impedance j.1 per-unit
The fence-likesymbolsat eitherend of thefigure represent “infinitebuses”, orpositivesequence
voltage sources.
The first step in this is to find the sequence networks. These are shown in Figure 15. Note that
they are exactly like what we would expect to have drawn for equivalent single phase networks.
Only the positive sequence network has sources, because the infinite bus supplies only positive
sequence voltage. The zero sequence network is open at the right hand side because of the delta­
wye transformer connection there.
j.1 I 1B j.05 j.02 j.1
∩∩∩∩ ∩∩∩∩ ∩∩∩∩ ∩∩∩∩
 + + 
1 Fault 1
− −
 
Positive Sequence
j.1 I 1B j.05 j.02 j.1
∩∩∩∩ ∩∩∩∩ ∩∩∩∩ ∩∩∩∩
Fault
Negative Sequence
j.1 I 0B j.1 j.1
∩∩∩∩ ∩∩∩∩ ∩∩∩∩
Fault
Zero Sequence
Figure 15: Sequence Networks
7.4.1 Symmetrical Fault
For a symmetrical (three-phase) fault, only the positive sequence network is involved. The fault
shorts the network at its position, so that the current is:
1
i = = −j6.67per−unit
1
j.15
7.4.2 Single Line-Ground Fault
For this situation, the three networks are in series and the situation is as shown in Figure 16
The current i shown in Figure 16 is a total current, and is given by:
1
i = = −j3.0
2×(j.15||j.12)+j.2
i
 
⊃ ⊃
i ⊃j.15 ⊃j.12
1B ⊃ ⊃
⊃ ⊃
⊃ ⊃
 + − 1 i 2 B ⊃ ⊃ j.15 ⊃ ⊃ j.12
⊃ ⊃
 
⊃
i ⊃j.2
0B ⊃
⊃
Figure 16: Completed Network For Single Line-Ground Fault
Then the sequence currents at the breaker are:
i = i
1B 2B
j.12
= i×
j.12+j.15
= −j1.33
i = i
0B
= −j3.0
The phase currents are re-constructed using:
i = i + i + i
a 1B 2B 0B
2
i = a i + ai + i
b 1B 2B 0B
i = ai + a2 i + i
c 1B 2B 0B
These are:
i = −j5.66 per-unit
a
i = −j1.67 per-unit
b
i = −j1.67 per-unit
c
7.4.3 Double Line-Ground Fault
For the double line-ground fault, the networks are in parallel, as shown in Figure 17.
⊃ ⊃ ⊃ ⊃ ⊃
i ⊃ j.15 ⊃j.12 i ⊃ j.15 ⊃j.12 i ⊃ j.2
1B ⊃ ⊃ 2B ⊃ ⊃ 0B ⊃
⊃ ⊃ ⊃ ⊃ ⊃
 + 
1
−
i 
 
Figure 17: Completed Network For Double Line-Ground Fault
To start, find the source current i:
1
i =
j(.15||.12)+j(.15||.12||.2)
= −j8.57
Then the sequence currents at the breaker are:
j.12
i = i×
1B
j.12+j.15
= −j3.81
j.12||j.2
i = −i×
2B
j.12||j.2+j.15
= j2.86
j.12||j.15
i = i×
0B
j.2+j.12||j.15
= j2.14
Reconstructed phase currents are:
i = j1.19
a
√
1 3
i = i − (i + i )− j(i −i )
b 0B 1B 2B 1B 2B
2 2
= j2.67−5.87
√
1 3
i = i − (i + i )+ j(i −i )
c 0B 1B 2B 1B 2B
2 2
= j2.67+5.87
|i | = 1.19 per-unit
a
|i | = 6.43 per-unit
b
|i | = 6.43 per-unit
c
7.4.4 Line-Line Fault
The situation is even easier here, as shown in Figure 18
⊃ ⊃ ⊃ ⊃
i ⊃ j.15 ⊃j.12 i ⊃ j.15 ⊃j.12
1B ⊃ ⊃ 2B ⊃ ⊃
⊃ ⊃ ⊃ ⊃
 + 
1
−
i 
 
Figure 18: Completed Network For Line-Line Fault
The source current i is:
1
i =
2×j(.15||.12)
= −j7.50
and then:
i = −i
1B 2B
j.12
= i
j.12+j.15
= −j3.33
Phase currents are:
i = 0
a
√
1 3
i = − (i + i )−j (i −i )
b 1B 2B 1B 2B
2 2
|i | = 5.77 per-unit
b
|i | = 5.77 per-unit
c
7.4.5 Conversion To Amperes
Base current is:
P
B
I = √ = 418.4A
B
3V Bl−l
Then current amplitudes are, in Amperes, RMS:
Phase A Phase B Phase C
Three-Phase Fault 2791 2791 2791
Single Line-Ground, φ 2368 699 699
a
Double Line-Ground, φ ,φ 498 2690 2690
b c
Line-Line,φ ,φ 0 2414 2414
b c
Massachusetts Institute of Technology
Department of Electrical Engineering and Computer Science
6.061 Introduction to Power Systems
Class Notes Chapter 5
Introduction To Load Flow ∗
J.L. Kirtley Jr.
1 Introduction
Even though electric power networks are composed of components which are (or can be approxi­
mated to be) linear, electric power flow, real and reactive, is a nonlinear quantity. The calculation
of load flow in a network is the solution to a set of nonlinear equations. The purpose of this note
is to describe how network load flows may be calculated.
This is only an elementary treatment of this problem: there is still quite a bit of activity in the
professional literature concerning load flow algorithms. The reason for this is that electric utility
networks are often quite large, having thousands of buses, so that the amount of computational
effort required for a solutionis substantial. A lot of effort goes into doing the calculationefficiently.
This discussion, and the little computer program at the end of this note, uses the crudest possible
algorithm for this purpose. However, for the relatively simple problems we will be doing, it should
work just fine.
2 Power Flow
Power flowinanetworkisdeterminedbythevoltageat eachbusof thenetwork and theimpedances
of the lines between buses. Power flow into and out of each of the buses that are network terminals
is the sum of power flows of all of the lines connected to that bus. The load flow problem consists
of finding the set of voltages: magnitude and angle, which, together with the network impedances,
produces the load flows that are known to be correct at the system terminals. To start, we view
the power system as being a collection of buses, connected together by lines. At each of the buses,
which we may regard as nodes, we may connect equipment which will supply power to or remove
power from the system. (Note: in speaking of power here, we are really referring to complex power,
with both real and reactive components). If we have made a connection to a given system node
(say with a generator), the complex power flow into the network at node k is:
S = P + jQ = V I∗ (1)
k k k k k
∗ c2003 James L. Kirtley Jr.
3 Bus Admittance
Now, if the network itself is linear, interconnections between buses and between buses and ground
can all be summarized in a multiport bus impedance matrix or its inverse, the bus admittance
matrix. As it turns out, the admittance matrix is easy to formulate.
The network consists of a number N of buses and another number N of lines. Each of the
b 
lines will have some (generally complex) impedance Z. We form the line admittance matrix by
placing the admittance (reciprocal of impedance) of each line on the appropriate spot on the main
diagonal of an N × N matrix:
 
1
0 0 ···
Z
1
1
0
0 ·
·
·
Z
· ⎤ (2)
Y = ⎡
2 0 1
0
·
·
Z
3 ⎥
⎢
⎢ . . . . . . ⎥
⎢ . . . ⎥
⎢ ⎥
⎣ ⎦
Interconnections between buses is described by the bus incidence matrix. This matrix, which
has N columns and N rows, has two entries for each line, corresponding to the buses at each end.
 b
A “direction” should be established for each line, and the entry for that line, at location (n , n ) in
b 
the node incidencd matrix, is a 1 for the “sending” end and a −1 at the “receiving” end. Actually,
it is not important which end is which. The bus incidence matrix for the network described by
Figure 1 below is:
1 0 0 0
0 0 0 1
⎡ ⎤
NI = −1 1 1 0
⎢
⎥
⎢ 0 0 −1 −1
⎥
⎢ ⎥
⎢ 0 −1 0 0 ⎥
⎢ ⎥
⎣ ⎦
It is not difficult to show that the bus admittance matrix is given by the easily computed
expression:
Y = NI Y NI (3)
 
The elements of the bus admittance matrix, the self– and mutual– admittances, are all of the
following form:
I
Y = k (4)
jk V
j
with all other voltages equal to zero.
Thus an alternative way to estimate the bus admittance matrix is to:
• Assume that all nodes (buses) are shorted to ground,
• Assume that one node is unshorted and connected to a voltage source,
• Calculate all node currents resulting from that one source.
• Do this for each node.
We may observe:
• Reciprocity holds:
Y = Y (5)
jk kj
• Driving point admittance Y is just the sum of all admittances of lines connected to bus k,
kk
including any fixed impedances connected from that bus to ground.
• Mutual admittance Y is minus the sum of the admittances of all lines connected directly
jk
between buses j and k. Usually there is only one such line.
Network currents are then given by:
I = Y V (6)
Where I is the vector of bus currents (that is, those currents entering the network at its buses. V
represents the bus voltages and Y is the bus admittance matrix. We will have more to say about
estimating the bus admittance matrix in another section. For the moment, note that an individual
bus current is given by:
N
I = Y V (7)
k jk j
j=1
 
where N is the number of buses in the network. Then complex power flow at a node is:
N
S = V Y ∗ V∗ (8)
k k jk j
j=1
 
Now, the typical load flow problem involves buses with different constraints. It is possible to
specify six quantities at each bus: voltage magnitude and angle, current magnitude and angle, real
and reactive power. These are, of course, inter–related so that any two of these are specified by the
other four, and the network itself provides two more constraints. Thus it is necessary to, in setting
up a load flow problem, specify two of these six quantities. Typical combinations are:
• Generator Bus: Real power and terminal voltage magnitude are specified.
• Load Bus: Real and reactive power are specified.
• Fixed Impedance: A fixed, linearimpedanceconnected to abusconstrainstherelationship
between voltage and current. Because it constrains both magnitude and angle, such an
impedance constitutes two constraints.
• Infinite Bus: This is a voltage source, of constant magnitude and phase angle.
The load flow problem consists of solving [8] as constrained by the terminal relationships.
One bus in a load flow problem is assigned to be the “slack bus” or “swing bus”. This bus,
which is taken to be an “infinite bus”, since it does not have real nor reactive power constrained,
accommodates real power dissipated and reactive power stored in network lines. This bus is nec­
essary because these losses are not known a priori. Further, one phase angle needs to be specified,
to serve as an origin for all of the others.
4 Gauss–Seidel Iterative Technique
Thisisoneof many techniquesforsolving thenonlinearloadflowproblem. Itshouldbepointed out
that this solution technique, while straightforward to use and easy to understand, has a tendency
to use a lot of computation, particularly in working large problems. It is also quite capable of
converging onincorrect solutions(thatisaproblemwith nonlinearsystems). Aswithotheriterative
techniques, it is often difficult to tell when the correct solution has been reached. Despite these
shortcomings, Gauss–Seidel can be used to get a good feel for load flow problems without excessive
numerical analysis baggage.
Suppose we have an initial estimate (ok: guess) for network voltages. We may partition [8] as:
S = V Y ∗ V ∗ + V Y ∗ V∗ (9)
k k jk j k kk k
j =k
 
Noting that S = P + jQ , we can solve for V∗ and, taking the complex conjugate of that, we
k k k k
have an expression for V in terms of all of the voltages of the network, P and Q :
k k k
1 P − jQ
V = k k − Y V (10)
k Y ⎛ V∗ jk j ⎞
kk k j =k
 
⎝ ⎠
Expression[10]isabetterestimateof V thanwestarted with. Thesolutiontotheset of nonlinear
k
equations consists of carrying out this expression, repeatedly, for all of the buses of the network.
An iterativeprocedure in which a correctionfor each of the voltagesof the network is computed
in one step, and the corrections applied all at once is called Gaussian Iteration. If, on the other
hand, the improved variables are used immediately, the procedure is called Gauss–Seidel Iteration.
Note that [10] uses as itsconstraintsP and Q forthe bus in question. Thus itis useabledirectly
for load type buses. For other types of bus constraints, modifications are required. We consider
only two of many possible sets of constraints.
For generator buses, usually the real power and terminal voltage magnitude are specified. At
each time step it is necessary to come out with a terminal voltage of specified magnitude: voltage
phase angle and reactive power Q are the unknowns. One way of handling this situation is to:
1. Generate an estimate for reactive power Q, then
2. Use [10] to generate an estimate for terminal voltage, and finally,
3. Holding voltage phase angle constant, adjust magnitude to the constraint.
At any point in the iteration, reactive power is:
N
Q = Im V Y ∗ V∗ (11)
k ⎧ k jk j ⎫
⎨ j =1 ⎬
It should be noted that there are other ⎩ways of doing ⎭this calculation. Generally they are
more work to set up but often converge more quickly. Newton’s method and variations are good
examples.
For buses loaded by constant impedance, it is sufficient to lump the load impedance into the
network. That is, the load admittance goes directly in parallel with the driving point admittance at
the node in question.
These three bus constraint types, generator, load and constant impedance are sufficient for
handling most problems of practical importance.
5 Example: Simple–Minded Program
Attached to this note is a MATLAB script which will set up carry out the Gauss–Seidel procedure
for networks with the simple constraints described here. The script is self-explanatory and carries
out the load flow described by the simple example below.
Notethat,aswithmany nonlinearequationsolvers,successsometimesrequireshaving aninitial
guess for the solution which is reasonably close to the final solution.
6 Example
Consider the system shown in Figure 1. This simple system has five buses (numbered 1 through 5)
and four lines. Two of the buses are connected to generators, two to loads and bus 5 is the “swing
bus”, represented as an “infinite bus”, or voltage supply.
For the purpose of this excercise, assume that the line impedances are:
Z 0 = .05+j.1
Z 1 = .05+j.05
Z 2 = .15+j.2
Z 3 = .04+j.12
(12)
Wealsospecifyrealpowerand voltagemagnitudeforthegeneratorsand real and reactivepower
for the loads:
• Bus 1: Real power is 1, voltage is 1.05 per–unit
• Bus 2: Real power is 1, voltage is 1.00 per–unit
• Bus 3: Real power is -.9 per–unit, reactive power is 0.
• Bus 4: Real power is -1, reactive power is -.2 per–unit.
Note that load power is taken to be negative, for this simple–minded program assumes all power
is measured into the network.
Bus 1 Bus 3 Bus 5
Z Z
1 2
∞
G
1
 
Bus 2 Bus 4 Z 3 P 1 + jQ 1
Z
4
G
2 P 2 + jQ 2
Figure 1: Sample System
% Simple-Minded Load Flow Example
% First, impedances
Z1=.05+j*.1;
Z2=.05+j*.05;
Z3=.15+j*.2;
Z4=.04+j*.12;
% This is the node-incidence Matrix
NI=[1 0 0 0;0 0 0 1;-1 1 1 0;0 0 -1 -1;0 -1 0 0];
% This is the vector of "known" voltage magnitudes
VNM = [1.05 1 0 0 1]’;
% And the vector of known voltage angles
VNA = [0 0 0 0 0]’;
% and this is the "key" to which are actually known
KNM = [1 1 0 0 1]’;
KNA = [0 0 0 0 1]’;
% and which are to be manipulated by the system
KUM = 1 - KNM;
KUA = 1 - KNA;
% Here are the known loads (positive is INTO network
% Use zeros for unknowns
P=[1 1 -.9 -1 0]’;
Q=[0 0 0 -.2 0]’;
% and here are the corresponding vectors to indicate
% which elements should be checked in error checking
PC = [1 1 1 1 0]’;
QC = [0 0 1 1 0]’;
Check = KNM + KNA + PC + QC;
% Unknown P and Q vectors
PU = 1 - PC;
QU = 1 - QC;
fprintf(’Here is the line admittance matrix:\n’);
Y=[1/Z1 0 0 0;0 1/Z2 0 0;0 0 1/Z3 0;0 0 0 1/Z4]
% Construct Node-Admittance Matrix
fprintf(’And here is the bus admittance matrix\n’)
YN=NI*Y*NI’
% Now: here are some starting voltage magnitudes and angles
VM = [1.05 1 .993 .949 1]’;
VA = [.0965 .146 .00713 .0261 0]’;
% Here starts a loop
Error = 1;
Tol=1e-10;
N = length(VNM);
% Construct a candidate voltage from what we have so far
VMAG = VNM .* KNM + VM .* KUM;
VANG = VNA .* KNA + VA .* KUA;
V = VMAG .* exp(j .* VANG);
% and calculate power to start
I = (YN*V);
PI = real(V .* conj(I));
QI = imag(V .* conj(I));
%pause
while(Error>Tol);
for i=1:N, % Run through all of the buses
% What we do depends on what bus!
if (KUM(i) == 1) & (KUA(i) == 1), % don’t know voltage magnitude or angle
pvc= (P(i)-j*Q(i))/conj(V(i));
for n=1:N,
if n ~=i, pvc = pvc - (YN(i,n) * V(n)); end
end
V(i) = pvc/YN(i,i);
elseif (KUM(i) == 0) & (KUA(i) == 1), % know magnitude but not angle
% first must generate an estimate for Q
Qn = imag(V(i) * conj(YN(i,:)*V));
pvc= (P(i)-j*Qn)/conj(V(i));
for n=1:N,
if n ~=i, pvc = pvc - (YN(i,n) * V(n)); end
end
pv=pvc/YN(i,i);
V(i) = VM(i) * exp(j*angle(pv));
end % probably should have more cases
end % one shot through voltage list: check error
% Now calculate currents indicated by this voltage expression
I = (YN*V);
% For error checking purposes, compute indicated power
PI = real(V .* conj(I));
QI = imag(V .* conj(I));
% Now we find out how close we are to desired conditions
PERR = (P-PI) .* PC;
QERR = (Q-QI) .* QC;
Error = sum(abs(PERR) .^2 + abs(QERR) .^2);
end
fprintf(’Here are the voltages\n’)
V
fprintf(’Real Power\n’)
P
fprintf(’Reactive Power\n’)
Q
