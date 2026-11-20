# University Physics Vol.2 직류·교류회로(OpenStax)(CC BY-NC-SA)

> 원문: OpenStax, *University Physics Volume 2* (Rice University) — https://openstax.org/details/books/university-physics-volume-2 · CC BY-NC-SA 4.0 · Access for free at openstax.org


CHAPTER 9
Current and Resistance

![이미지](images/page000_img00.webp)

| FIGURE 9.1 Magnetic resonance imaging (MRI) uses superconducting magnets and produces high-resolution images without the dangerof radiation. The image on the left shows the spacing of vertebrae along a human spinal column, with the circle indicating where thevertebrae are too close due to a ruptured disc. On the right is a picture of the MRI instrument, which surrounds the patient on all sides. Alarge amount of electrical current is required to operate the electromagnets (credit right: modification of work by the National Institutesof Health, Department of Health & Human Services). |
| --- |

CHAPTER OUTLINE
9.1 Electrical Current
9.2 Model of Conduction in Metals
9.3 Resistivity and Resistance
9.4 Ohm's Law
9.5 Electrical Energy and Power
9.6 Superconductors
INTRODUCTION In this chapter, we study the electrical current through a material, where the electrical current is
the rate of flow of charge. We also examine a characteristic of materials known as the resistance. Resistance is a
measure of how much a material impedes the flow of charge, and it will be shown that the resistance depends on
temperature. In general, a good conductor, such as copper, gold, or silver, has very low resistance. Some materials,
called superconductors, have zero resistance at very low temperatures.
High currents are required for the operation of electromagnets. Superconductors can be used to make
electromagnets that are 10 times stronger than the strongest conventional electromagnets. These superconducting
magnets are used in the construction of magnetic resonance imaging (MRI) devices that can be used to make high-
resolution images of the human body. The chapter-opening picture shows an MRI image of the vertebrae of a human
subject and the MRI device itself. Superconducting magnets have many other uses. For example, superconducting
magnets are used in the Large Hadron Collider (LHC) to curve the path of protons in the ring.
362 9 • Current and Resistance
9.1 Electrical Current
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Describe an electrical current
• Define the unit of electrical current
• Explain the direction of current flow
Up to now, we have considered primarily static charges. When charges did move, they were accelerated in response
to an electrical field created by a voltage difference. The charges lost potential energy and gained kinetic energy as
they traveled through a potential difference where the electrical field did work on the charge.
Although charges do not require a material to flow through, the majority of this chapter deals with understanding the
movement of charges through a material. The rate at which the charges flow past a location—that is, the amount of
charge per unit time—is known as the electrical current. When charges flow through a medium, the current depends
on the voltage applied, the material through which the charges flow, and the state of the material. Of particular
interest is the motion of charges in a conducting wire. In previous chapters, charges were accelerated due to the
force provided by an electrical field, losing potential energy and gaining kinetic energy. In this chapter, we discuss
the situation of the force provided by an electrical field in a conductor, where charges lose kinetic energy to the
material reaching a constant velocity, known as the “drift velocity.” This is analogous to an object falling through the
atmosphere and losing kinetic energy to the air, reaching a constant terminal velocity.
If you have ever taken a course in first aid or safety, you may have heard that in the event of electric shock, it is the
current, not the voltage, which is the important factor on the severity of the shock and the amount of damage to the
human body. Current is measured in units called amperes; you may have noticed that circuit breakers in your home
and fuses in your car are rated in amps (or amperes). But what is the ampere and what does it measure?
Defining Current and the Ampere
Electrical current is defined to be the rate at which charge flows. When there is a large current present, such as that
used to run a refrigerator, a large amount of charge moves through the wire in a small amount of time. If the current
is small, such as that used to operate a handheld calculator, a small amount of charge moves through the circuit
over a long period of time.
ELECTRICAL CURRENT
The average electrical current I is the rate at which charge flows,
9.1
where is the amount of net charge passing through a given cross-sectional area in time (Figure 9.2). The
SI unit for current is the ampere (A), named for the French physicist André-Marie Ampère (1775–1836). Since
, we see that an ampere is defined as one coulomb of charge passing through a given area per second:
9.2
The instantaneous electrical current, or simply the electrical current, is the time derivative of the charge that
flows and is found by taking the limit of the average electrical current as :
9.3
Most electrical appliances are rated in amperes (or amps) required for proper operation, as are fuses and circuit
breakers.
9.1 • Electrical Current 363

![이미지](images/page002_img00.webp)

FIGURE 9.2 The rate of flow of charge is current. An ampere is the flow of one coulomb of charge through an area in one second. A current
of one amp would result from electrons flowing through the area A each second.
EXAMPLE 9.1
Calculating the Average Current
The main purpose of a battery in a car or truck is to run the electric starter motor, which starts the engine. The
operation of starting the vehicle requires a large current to be supplied by the battery. Once the engine starts, a
device called an alternator takes over supplying the electric power required for running the vehicle and for charging
the battery.
(a) What is the average current involved when a truck battery sets in motion 720 C of charge in 4.00 s while starting
an engine? (b) How long does it take 1.00 C of charge to flow from the battery?
Strategy
We can use the definition of the average current in the equation to find the average current in part (a), since
charge and time are given. For part (b), once we know the average current, we can its definition to find the
time required for 1.00 C of charge to flow from the battery.
Solution
a. Entering the given values for charge and time into the definition of current gives
b. Solving the relationship for time and entering the known values for charge and current gives
Significance
a. This large value for current illustrates the fact that a large charge is moved in a small amount of time. The currents
in these “starter motors” are fairly large to overcome the inertia of the engine. b. A high current requires a short time
to supply a large amount of charge. This large current is needed to supply the large amount of energy needed to start
the engine.
EXAMPLE 9.2
Calculating Instantaneous Currents
Consider a charge moving through a cross-section of a wire where the charge is modeled as
. Here, is the charge after a long period of time, as time approaches infinity, with units
of coulombs, and is a time constant with units of seconds (see Figure 9.3). What is the current through the wire?
364 9 • Current and Resistance

![이미지](images/page003_img00.webp)

FIGURE 9.3 A graph of the charge moving through a cross-section of a wire over time.
Strategy
The current through the cross-section can be found from . Notice from the figure that the charge increases
to and the derivative decreases, approaching zero, as time increases (Figure 9.4).
Solution
The derivative can be found using .

![이미지](images/page003_img01.webp)

FIGURE 9.4 A graph of the current flowing through the wire over time.
Significance
The current through the wire in question decreases exponentially, as shown in Figure 9.4. In later chapters, it will be
shown that a time-dependent current appears when a capacitor charges or discharges through a resistor. Recall that
a capacitor is a device that stores charge. You will learn about the resistor in Model of Conduction in Metals.
CHECK YOUR UNDERSTANDING 9.1
Handheld calculators often use small solar cells to supply the energy required to complete the calculations needed
to complete your next physics exam. The current needed to run your calculator can be as small as 0.30 mA. How
long would it take for 1.00 C of charge to flow from the solar cells? Can solar cells be used, instead of batteries, to
start traditional internal combustion engines presently used in most cars and trucks?
CHECK YOUR UNDERSTANDING 9.2
Circuit breakers in a home are rated in amperes, normally in a range from 10 amps to 30 amps, and are used to
protect the residents from harm and their appliances from damage due to large currents. A single 15-amp circuit
9.1 • Electrical Current 365
breaker may be used to protect several outlets in the living room, whereas a single 20-amp circuit breaker may be
used to protect the refrigerator in the kitchen. What can you deduce from this about current used by the various
appliances?
Current in a Circuit
In the previous paragraphs, we defined the current as the charge that flows through a cross-sectional area per unit
time. In order for charge to flow through an appliance, such as the headlight shown in Figure 9.5, there must be a
complete path (or circuit) from the positive terminal to the negative terminal. Consider a simple circuit of a car
battery, a switch, a headlight lamp, and wires that provide a current path between the components. In order for the
lamp to light, there must be a complete path for current flow. In other words, a charge must be able to leave the
positive terminal of the battery, travel through the component, and back to the negative terminal of the battery. The
switch is there to control the circuit. Part (a) of the figure shows the simple circuit of a car battery, a switch, a
conducting path, and a headlight lamp. Also shown is the schematic of the circuit [part (b)]. A schematic is a
graphical representation of a circuit and is very useful in visualizing the main features of a circuit. Schematics use
standardized symbols to represent the components in a circuits and solid lines to represent the wires connecting
the components. The battery is shown as a series of long and short lines, representing the historic voltaic pile. The
lamp is shown as a circle with a loop inside, representing the filament of an incandescent bulb. The switch is shown
as two points with a conducting bar to connect the two points and the wires connecting the components are shown
as solid lines. The schematic in part (c) shows the direction of current flow when the switch is closed.

![이미지](images/page004_img00.webp)

FIGURE 9.5 (a) A simple electric circuit of a headlight (lamp), a battery, and a switch. When the switch is closed, an uninterrupted path for
current to flow through is supplied by conducting wires connecting a load to the terminals of a battery. (b) In this schematic, the battery is
represented by parallel lines, which resemble plates in the original design of a battery. The longer lines indicate the positive terminal. The
conducting wires are shown as solid lines. The switch is shown, in the open position, as two terminals with a line representing a conducting
bar that can make contact between the two terminals. The lamp is represented by a circle encompassing a filament, as would be seen in an
incandescent light bulb. (c) When the switch is closed, the circuit is complete and current flows from the positive terminal to the negative
terminal of the battery.
When the switch is closed in Figure 9.5(c), there is a complete path for charges to flow, from the positive terminal of
the battery, through the switch, then through the headlight and back to the negative terminal of the battery. Note
that the direction of current flow is from positive to negative. The direction of conventional current is always
represented in the direction that positive charge would flow, from the positive terminal to the negative terminal.
The conventional current flows from the positive terminal to the negative terminal, but depending on the actual
situation, positive charges, negative charges, or both may move. In metal wires, for example, current is carried by
electrons—that is, negative charges move. In ionic solutions, such as salt water, both positive and negative charges
move. This is also true in nerve cells. A Van de Graaff generator, used for nuclear research, can produce a current of
pure positive charges, such as protons. In the Tevatron Accelerator at Fermilab, before it was shut down in 2011,
beams of protons and antiprotons traveling in opposite directions were collided. The protons are positive and
therefore their current is in the same direction as they travel. The antiprotons are negativity charged and thus their
current is in the opposite direction that the actual particles travel.
366 9 • Current and Resistance
A closer look at the current flowing through a wire is shown in Figure 9.6. The figure illustrates the movement of
charged particles that compose a current. The fact that conventional current is taken to be in the direction that
positive charge would flow can be traced back to American scientist and statesman Benjamin Franklin in the 1700s.
Having no knowledge of the particles that make up the atom (namely the proton, electron, and neutron), Franklin
believed that electrical current flowed from a material that had more of an “electrical fluid” and to a material that
had less of this “electrical fluid.” He coined the term positive for the material that had more of this electrical fluid
and negative for the material that lacked the electrical fluid. He surmised that current would flow from the material
with more electrical fluid—the positive material—to the negative material, which has less electrical fluid. Franklin
called this direction of current a positive current flow. This was pretty advanced thinking for a man who knew
nothing about the atom.

![이미지](images/page005_img00.webp)

FIGURE 9.6 Current I is the rate at which charge moves through an area A, such as the cross-section of a wire. Conventional current is
defined to move in the direction of the electrical field. (a) Positive charges move in the direction of the electrical field, which is the same
direction as conventional current. (b) Negative charges move in the direction opposite to the electrical field. Conventional current is in the
direction opposite to the movement of negative charge. The flow of electrons is sometimes referred to as electronic flow.
We now know that a material is positive if it has a greater number of protons than electrons, and it is negative if it
has a greater number of electrons than protons. In a conducting metal, the current flow is due primarily to electrons
flowing from the negative material to the positive material, but for historical reasons, we consider the positive
current flow and the current is shown to flow from the positive terminal of the battery to the negative terminal.
It is important to realize that an electrical field is present in conductors and is responsible for producing the current
(Figure 9.6). In previous chapters, we considered the static electrical case, where charges in a conductor quickly
redistribute themselves on the surface of the conductor in order to cancel out the external electrical field and
restore equilibrium. In the case of an electrical circuit, the charges are prevented from ever reaching equilibrium by
an external source of electric potential, such as a battery. The energy needed to move the charge is supplied by the
electric potential from the battery.
Although the electrical field is responsible for the motion of the charges in the conductor, the work done on the
charges by the electrical field does not increase the kinetic energy of the charges. We will show that the electrical
field is responsible for keeping the electric charges moving at a “drift velocity.”
9.2 Model of Conduction in Metals
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Define the drift velocity of charges moving through a metal
• Define the vector current density
• Describe the operation of an incandescent lamp
When electrons move through a conducting wire, they do not move at a constant velocity, that is, the electrons do
not move in a straight line at a constant speed. Rather, they interact with and collide with atoms and other free
electrons in the conductor. Thus, the electrons move in a zig-zag fashion and drift through the wire. We should also
note that even though it is convenient to discuss the direction of current, current is a scalar quantity. When
discussing the velocity of charges in a current, it is more appropriate to discuss the current density. We will come
back to this idea at the end of this section.
9.2 • Model of Conduction in Metals 367
Drift Velocity
Electrical signals move very rapidly. Telephone conversations carried by currents in wires cover large distances
without noticeable delays. Lights come on as soon as a light switch is moved to the ‘on’ position. Most electrical
signals carried by currents travel at speeds on the order of , a significant fraction of the speed of light.
Interestingly, the individual charges that make up the current move much slower on average, typically drifting at
speeds on the order of . How do we reconcile these two speeds, and what does it tell us about standard
conductors?
The high speed of electrical signals results from the fact that the electrons behave as an incompressible fluid. Thus,
when a free charge is forced into a wire, as in Figure 9.7, another leaves almost immediately, carrying the signal
rapidly forward. The signal is passed on rapidly as an electrical shock wave moving through the system at nearly the
speed of light. To be precise, this fast-moving signal, or shock wave, is a rapidly propagating change in the electrical
field due to equally rapid adjustments of surface charge.

![이미지](images/page006_img00.webp)

FIGURE 9.7 When charged particles are forced into this volume of a conductor, an equal number are quickly forced to leave. The repulsion
between like charges makes it difficult to increase the number of charges in a volume. Thus, as one charge enters, another leaves almost
immediately, carrying the signal rapidly forward.
Good conductors have large numbers of free charges. In metals, the free charges are free electrons. (In fact, good
electrical conductors are often good heat conductors too, because large numbers of free electrons can transport
thermal energy as well as carry electrical current.) Figure 9.8 shows how free electrons move through an ordinary
conductor. The distance that an individual electron can move between collisions with atoms or other electrons is
quite small. The electron paths thus appear nearly random, like the motion of atoms in a gas. But there is an
electrical field in the conductor that causes the electrons to drift in the direction shown (opposite to the field, since
they are negative). The drift velocity is the average velocity of the free charges. Drift velocity is quite small, since
there are so many free charges. If we have an estimate of the density of free electrons in a conductor, we can
calculate the drift velocity for a given current. The larger the density, the lower the velocity required for a given
current.

![이미지](images/page006_img01.webp)

FIGURE 9.8 Free electrons moving in a conductor make many collisions with other electrons and other particles. A typical path of one
electron is shown. The average velocity of the free charges is called the drift velocity and for electrons, it is in the direction opposite to
the electrical field. The collisions normally transfer energy to the conductor, requiring a constant supply of energy to maintain a steady
current.
Free-electron collisions transfer energy to the atoms of the conductor. The electrical field does work in moving the
electrons through a distance, but that work does not increase the kinetic energy (nor speed) of the electrons. The
work is transferred to the conductor’s atoms, often increasing temperature. Thus, a continuous power input is
required to keep a current flowing. (An exception is superconductors, for reasons we shall explore in a later chapter.
Superconductors can have a steady current without a continual supply of energy—a great energy savings.) For a
conductor that is not a superconductor, the supply of energy can be useful, as in an incandescent light bulb filament
(Figure 9.9). The supply of energy is necessary to increase the temperature of the tungsten filament, so that the
filament glows.
368 9 • Current and Resistance

![이미지](images/page007_img00.webp)

FIGURE 9.9 The incandescent lamp is a simple design. A tungsten filament is placed in a partially evacuated glass envelope. One end of the
filament is attached to the screw base, which is made out of a conducting material. The second end of the filament is attached to a second
contact in the base of the bulb. The two contacts are separated by an insulating material. Current flows through the filament, and the
temperature of the filament becomes large enough to cause the filament to glow and produce light. However, these bulbs are not very
energy efficient, as evident from the heat coming from the bulb. In the year 2012, the United States, along with many other countries,
began to phase out incandescent lamps in favor of more energy-efficient lamps, such as light-emitting diode (LED) lamps and compact
fluorescent lamps (CFL) (credit right: modification of work by Serge Saint).
We can obtain an expression for the relationship between current and drift velocity by considering the number of
free charges in a segment of wire, as illustrated in Figure 9.10. The number of free charges per unit volume, or the
number density of free charges, is given the symbol n where . The value of n depends on the
material. The shaded segment has a volume , so that the number of free charges in the volume is .
The charge dQ in this segment is thus , where q is the amount of charge on each carrier. (The magnitude of
the charge of electrons is .) Current is charge moved per unit time; thus, if all the original
charges move out of this segment in time dt, the current is
Rearranging terms gives
9.4
where is the drift velocity, n is the free charge density, A is the cross-sectional area of the wire, and I is the
current through the wire. The carriers of the current each have charge q and move with a drift velocity of magnitude
.

![이미지](images/page007_img01.webp)

FIGURE 9.10 All the charges in the shaded volume of this wire move out in a time dt, having a drift velocity of magnitude .
Note that simple drift velocity is not the entire story. The speed of an electron is sometimes much greater than its
drift velocity. In addition, not all of the electrons in a conductor can move freely, and those that do move might move
somewhat faster or slower than the drift velocity. So what do we mean by free electrons?
Atoms in a metallic conductor are packed in the form of a lattice structure. Some electrons are far enough away
9.2 • Model of Conduction in Metals 369
from the atomic nuclei that they do not experience the attraction of the nuclei as strongly as the inner electrons do.
These are the free electrons. They are not bound to a single atom but can instead move freely among the atoms in a
“sea” of electrons. When an electrical field is applied, these free electrons respond by accelerating. As they move,
they collide with the atoms in the lattice and with other electrons, generating thermal energy, and the conductor
gets warmer. In an insulator, the organization of the atoms and the structure do not allow for such free electrons.
As you know, electric power is usually supplied to equipment and appliances through round wires made of a
conducting material (copper, aluminum, silver, or gold) that are stranded or solid. The diameter of the wire
determines the current-carrying capacity—the larger the diameter, the greater the current-carrying capacity. Even
though the current-carrying capacity is determined by the diameter, wire is not normally characterized by the
diameter directly. Instead, wire is commonly sold in a unit known as “gauge.” Wires are manufactured by passing
the material through circular forms called “drawing dies.” In order to make thinner wires, manufacturers draw the
wires through multiple dies of successively thinner diameter. Historically, the gauge of the wire was related to the
number of drawing processes required to manufacture the wire. For this reason, the larger the gauge, the smaller
the diameter. In the United States, the American Wire Gauge (AWG) was developed to standardize the system.
Household wiring commonly consists of 10-gauge (2.588-mm diameter) to 14-gauge (1.628-mm diameter) wire. A
device used to measure the gauge of wire is shown in Figure 9.11.

![이미지](images/page008_img00.webp)

FIGURE 9.11 A device for measuring the gauge of electrical wire. As you can see, higher gauge numbers indicate thinner wires. (credit:
Joseph J. Trout)
EXAMPLE 9.3
Calculating Drift Velocity in a Common Wire
Calculate the drift velocity of electrons in a copper wire with a diameter of 2.053 mm (12-gauge) carrying a 20.0-A
current, given that there is one free electron per copper atom. (Household wiring often contains 12-gauge copper
wire, and the maximum current allowed in such wire is usually 20.0 A.) The density of copper is
and the atomic mass of copper is 63.54 g/mol.
Strategy
We can calculate the drift velocity using the equation . The current is and
is the charge of an electron. We can calculate the area of a cross-section of the wire using the
formula , where r is one-half the diameter. The given diameter is 2.053 mm, so r is 1.0265 mm. We are
given the density of copper, , and the atomic mass of copper is . We can use these
two quantities along with Avogadro’s number, , to determine n, the number of free
electrons per cubic meter.
370 9 • Current and Resistance
Solution
First, we calculate the density of free electrons in copper. There is one free electron per copper atom. Therefore, the
number of free electrons is the same as the number of copper atoms per . We can now find n as follows:
The cross-sectional area of the wire is
Rearranging to isolate drift velocity gives
Significance
The minus sign indicates that the negative charges are moving in the direction opposite to conventional current. The
small value for drift velocity (on the order of confirms that the signal moves on the order of times
faster (about than the charges that carry it.
CHECK YOUR UNDERSTANDING 9.3
In Example 9.4, the drift velocity was calculated for a 2.053-mm diameter (12-gauge) copper wire carrying a
20-amp current. Would the drift velocity change for a 1.628-mm diameter (14-gauge) wire carrying the same
20-amp current?
Current Density
Although it is often convenient to attach a negative or positive sign to indicate the overall direction of motion of the
charges, current is a scalar quantity, . It is often necessary to discuss the details of the motion of the charge,
instead of discussing the overall motion of the charges. In such cases, it is necessary to discuss the current density,
, a vector quantity. The current density is the flow of charge through an infinitesimal area, divided by the area. The
current density must take into account the local magnitude and direction of the charge flow, which varies from point
to point. The unit of current density is ampere per meter squared, and the direction is defined as the direction of net
flow of positive charges through the area.
The relationship between the current and the current density can be seen in Figure 9.12. The differential current
flow through the area is found as
where is the angle between the area and the current density. The total current passing through area can be
found by integrating over the area,
9.5
Consider the magnitude of the current density, which is the current divided by the area:
9.3 • Resistivity and Resistance 371
Thus, the current density is . If q is positive, is in the same direction as the electrical field . If q is
negative, is in the opposite direction of . Either way, the direction of the current density is in the direction of
the electrical field .

![이미지](images/page010_img00.webp)

FIGURE 9.12 The current density is defined as the current passing through an infinitesimal cross-sectional area divided by the area. The
direction of the current density is the direction of the net flow of positive charges and the magnitude is equal to the current divided by the
infinitesimal area.
EXAMPLE 9.4
Calculating the Current Density in a Wire
The current supplied to a lamp with a 100-W light bulb is 0.87 amps. The lamp is wired using a copper wire with
diameter 2.588 mm (10-gauge). Find the magnitude of the current density.
Strategy
The current density is the current moving through an infinitesimal cross-sectional area divided by the area. We can
calculate the magnitude of the current density using . The current is given as 0.87 A. The cross-sectional
area can be calculated to be .
Solution
Calculate the current density using the given current and the area, found to be .
Significance
The current density in a conducting wire depends on the current through the conducting wire and the cross-
sectional area of the wire. For a given current, as the diameter of the wire increases, the charge density decreases.
CHECK YOUR UNDERSTANDING 9.4
The current density is proportional to the current and inversely proportional to the area. If the current density in a
conducting wire increases, what would happen to the drift velocity of the charges in the wire?
What is the significance of the current density? The current density is proportional to the current, and the current is
the number of charges that pass through a cross-sectional area per second. The charges move through the
conductor, accelerated by the electric force provided by the electrical field. The electrical field is created when a
voltage is applied across the conductor. In Ohm’s Law, we will use this relationship between the current density and
the electrical field to examine the relationship between the current through a conductor and the voltage applied.
9.3 Resistivity and Resistance
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Differentiate between resistance and resistivity
• Define the term conductivity
• Describe the electrical component known as a resistor
• State the relationship between resistance of a resistor and its length, cross-sectional area, and resistivity
• State the relationship between resistivity and temperature
372 9 • Current and Resistance
What drives current? We can think of various devices—such as batteries, generators, wall outlets, and so on—that
are necessary to maintain a current. All such devices create a potential difference and are referred to as voltage
sources. When a voltage source is connected to a conductor, it applies a potential difference V that creates an
electrical field. The electrical field, in turn, exerts force on free charges, causing current. The amount of current
depends not only on the magnitude of the voltage, but also on the characteristics of the material that the current is
flowing through. The material can resist the flow of the charges, and the measure of how much a material resists the
flow of charges is known as the resistivity. This resistivity is crudely analogous to the friction between two materials
that resists motion.
Resistivity
When a voltage is applied to a conductor, an electrical field is created, and charges in the conductor feel a force
due to the electrical field. The current density that results depends on the electrical field and the properties of the
material. This dependence can be very complex. In some materials, including metals at a given temperature, the
current density is approximately proportional to the electrical field. In these cases, the current density can be
modeled as
where is the electrical conductivity. The electrical conductivity is analogous to thermal conductivity and is a
measure of a material’s ability to conduct or transmit electricity. Conductors have a higher electrical conductivity
than insulators. Since the electrical conductivity is , the units are
Here, we define a unit named the ohm with the Greek symbol uppercase omega, . The unit is named after Georg
Simon Ohm, whom we will discuss later in this chapter. The is used to avoid confusion with the number 0. One
ohm equals one volt per amp: . The units of electrical conductivity are therefore .
Conductivity is an intrinsic property of a material. Another intrinsic property of a material is the resistivity, or
electrical resistivity. The resistivity of a material is a measure of how strongly a material opposes the flow of
electrical current. The symbol for resistivity is the lowercase Greek letter rho, , and resistivity is the reciprocal of
electrical conductivity:
The unit of resistivity in SI units is the ohm-meter . We can define the resistivity in terms of the electrical
field and the current density,
9.6
The greater the resistivity, the larger the field needed to produce a given current density. The lower the resistivity,
the larger the current density produced by a given electrical field. Good conductors have a high conductivity and low
resistivity. Good insulators have a low conductivity and a high resistivity. Table 9.1 lists resistivity and conductivity
values for various materials.
9.3 • Resistivity and Resistance 373
Material Conductivity, Resistivity, Temperature
Coefficient,

|  | 2300 |
| --- | --- |

Conductors
Silver 0.0038
Copper 0.0039
Gold 0.0034
Aluminum 0.0039
Tungsten 0.0045
Iron 0.0065
Platinum 0.0039
Steel
Lead
Manganin (Cu, Mn, Ni alloy) 0.000002
Constantan (Cu, Ni alloy) 0.00003
Mercury 0.0009
Nichrome (Ni, Fe, Cr alloy) 0.0004
Semiconductors[1]
Carbon (pure) −0.0005
Carbon −0.0005
Germanium (pure) −0.048
Germanium −0.050
Silicon (pure) −0.075
Silicon −0.07
Insulators
Amber
TABLE 9.1 Resistivities and Conductivities of Various Materials at 20 °C [1] Values depend strongly on amounts
and types of impurities.
374 9 • Current and Resistance
Material Conductivity, Resistivity, Temperature
Coefficient,
Glass
Lucite
Mica
Quartz (fused)
Rubber (hard)
Sulfur
TeflonTM
Wood
TABLE 9.1 Resistivities and Conductivities of Various Materials at 20 °C [1] Values depend strongly on amounts
and types of impurities.
The materials listed in the table are separated into categories of conductors, semiconductors, and insulators, based
on broad groupings of resistivity. Conductors have the smallest resistivity, and insulators have the largest;
semiconductors have intermediate resistivity. Conductors have varying but large, free charge densities, whereas
most charges in insulators are bound to atoms and are not free to move. Semiconductors are intermediate, having
far fewer free charges than conductors, but having properties that make the number of free charges depend strongly
on the type and amount of impurities in the semiconductor. These unique properties of semiconductors are put to
use in modern electronics, as we will explore in later chapters.
CHECK YOUR UNDERSTANDING 9.5
Copper wires are routinely used for extension cords and house wiring for several reasons. Copper has the highest
electrical conductivity rating, and therefore the lowest resistivity rating, of all nonprecious metals. Also important is
the tensile strength, where the tensile strength is a measure of the force required to pull an object to the point
where it breaks. The tensile strength of a material is the maximum amount of tensile stress it can take before
breaking. Copper has a high tensile strength, . A third important characteristic is ductility. Ductility is a
measure of a material’s ability to be drawn into wires and a measure of the flexibility of the material, and copper has
a high ductility. Summarizing, for a conductor to be a suitable candidate for making wire, there are at least three
important characteristics: low resistivity, high tensile strength, and high ductility. What other materials are used for
wiring and what are the advantages and disadvantages?
Temperature Dependence of Resistivity
Looking back at Table 9.1, you will see a column labeled “Temperature Coefficient.” The resistivity of some
materials has a strong temperature dependence. In some materials, such as copper, the resistivity increases with
increasing temperature. In fact, in most conducting metals, the resistivity increases with increasing temperature.
The increasing temperature causes increased vibrations of the atoms in the lattice structure of the metals, which
impede the motion of the electrons. In other materials, such as carbon, the resistivity decreases with increasing
temperature. In many materials, the dependence is approximately linear and can be modeled using a linear
equation:
9.3 • Resistivity and Resistance 375
9.7
where is the resistivity of the material at temperature T, is the temperature coefficient of the material, and is
the resistivity at , usually taken as .
Note also that the temperature coefficient is negative for the semiconductors listed in Table 9.1, meaning that
their resistivity decreases with increasing temperature. They become better conductors at higher temperature,
because increased thermal agitation increases the number of free charges available to carry current. This property
of decreasing with temperature is also related to the type and amount of impurities present in the
semiconductors.
Resistance
We now consider the resistance of a wire or component. The resistance is a measure of how difficult it is to pass
current through a wire or component. Resistance depends on the resistivity. The resistivity is a characteristic of the
material used to fabricate a wire or other electrical component, whereas the resistance is a characteristic of the wire
or component.
To calculate the resistance, consider a section of conducting wire with cross-sectional area A, length L, and
resistivity A battery is connected across the conductor, providing a potential difference across it (Figure
9.13). The potential difference produces an electrical field that is proportional to the current density, according to
.

![이미지](images/page014_img00.webp)

FIGURE 9.13 A potential provided by a battery is applied to a segment of a conductor with a cross-sectional area A and a length L.
The magnitude of the electrical field across the segment of the conductor is equal to the voltage divided by the
length, , and the magnitude of the current density is equal to the current divided by the cross-sectional
area, As with capacitance, we use V to represent the potential difference ΔV across the resistor. Using this
information and recalling that the electrical field is proportional to the resistivity and the current density, we can see
that the voltage is proportional to the current:
RESISTANCE
The ratio of the voltage to the current is defined as the resistance R:
9.8
The resistance of a cylindrical segment of a conductor is equal to the resistivity of the material times the length
divided by the area:
376 9 • Current and Resistance
9.9
The unit of resistance is the ohm, . For a given voltage, the higher the resistance, the lower the current.
Resistors
A common component in electronic circuits is the resistor. The resistor can be used to reduce current flow or
provide a voltage drop. Figure 9.14 shows the symbols used for a resistor in schematic diagrams of a circuit. Two
commonly used standards for circuit diagrams are provided by the American National Standard Institute (ANSI,
pronounced “AN-see”) and the International Electrotechnical Commission (IEC). Both systems are commonly used.
We use the ANSI standard in this text for its visual recognition, but we note that for larger, more complex circuits,
the IEC standard may have a cleaner presentation, making it easier to read.

![이미지](images/page015_img00.webp)

FIGURE 9.14 Symbols for a resistor used in circuit diagrams. (a) The ANSI symbol; (b) the IEC symbol.
Material and shape dependence of resistance
A resistor can be modeled as a cylinder with a cross-sectional area A and a length L, made of a material with a
resistivity (Figure 9.15). The resistance of the resistor is .

![이미지](images/page015_img01.webp)

FIGURE 9.15 A model of a resistor as a uniform cylinder of length L and cross-sectional area A. Its resistance to the flow of current is
analogous to the resistance posed by a pipe to fluid flow. The longer the cylinder, the greater its resistance. The larger its cross-sectional
area A, the smaller its resistance.
The most common material used to make a resistor is carbon. A carbon track is wrapped around a ceramic core, and
two copper leads are attached. A second type of resistor is the metal film resistor, which also has a ceramic core.
The track is made from a metal oxide material, which has semiconductive properties similar to carbon. Again,
copper leads are inserted into the ends of the resistor. The resistor is then painted and marked for identification. A
resistor has four colored bands, as shown in Figure 9.16.
9.3 • Resistivity and Resistance 377

![이미지](images/page016_img00.webp)

FIGURE 9.16 Many resistors resemble the figure shown above. The four bands are used to identify the resistor. The first two colored bands
represent the first two digits of the resistance of the resistor. The third color is the multiplier. The fourth color represents the tolerance of
the resistor. The resistor shown has a resistance of .
Resistances range over many orders of magnitude. Some ceramic insulators, such as those used to support power
lines, have resistances of or more. A dry person may have a hand-to-foot resistance of , whereas the
resistance of the human heart is about . A meter-long piece of large-diameter copper wire may have a
resistance of , and superconductors have no resistance at all at low temperatures. As we have seen,
resistance is related to the shape of an object and the material of which it is composed.
EXAMPLE 9.5
Current Density, Resistance, and Electrical field for a Current-Carrying Wire
Calculate the current density, resistance, and electrical field of a 5-m length of copper wire with a diameter of 2.053
mm (12-gauge) carrying a current of .
Strategy
We can calculate the current density by first finding the cross-sectional area of the wire, which is
and the definition of current density . The resistance can be found using the length of the wire ,
the area, and the resistivity of copper , where . The resistivity and current density
can be used to find the electrical field.
Solution
First, we calculate the current density:
The resistance of the wire is
Finally, we can find the electrical field:
Significance
From these results, it is not surprising that copper is used for wires for carrying current because the resistance is
378 9 • Current and Resistance
quite small. Note that the current density and electrical field are independent of the length of the wire, but the
voltage depends on the length.
INTERACTIVE
Engage the simulation below to see what the effects of the cross-sectional area, the length, and the resistivity of a
wire are on the resistance of a conductor. Adjust the variables using slide bars and see if the resistance becomes
smaller or larger.
Access multimedia content (https://openstax.org/l/21resistwire)
The resistance of an object also depends on temperature, since is directly proportional to For a cylinder, we
know , so if L and A do not change greatly with temperature, R has the same temperature dependence as
(Examination of the coefficients of linear expansion shows them to be about two orders of magnitude less than
typical temperature coefficients of resistivity, so the effect of temperature on L and A is about two orders of
magnitude less than on Thus,
9.10
is the temperature dependence of the resistance of an object, where is the original resistance (usually taken to
be and R is the resistance after a temperature change The color code gives the resistance of the
resistor at a temperature of .
Numerous thermometers are based on the effect of temperature on resistance (Figure 9.17). One of the most
common thermometers is based on the thermistor, a semiconductor crystal with a strong temperature dependence,
the resistance of which is measured to obtain its temperature. The device is small, so that it quickly comes into
thermal equilibrium with the part of a person it touches.

![이미지](images/page017_img00.webp)

FIGURE 9.17 These familiar thermometers are based on the automated measurement of a thermistor’s temperature-dependent
resistance.
EXAMPLE 9.6
Calculating Resistance
Although caution must be used in applying and for temperature changes
greater than , for tungsten, the equations work reasonably well for very large temperature changes. A
tungsten filament at has a resistance of . What would the resistance be if the temperature is
increased to ?
Strategy
This is a straightforward application of , since the original resistance of the filament is given as
and the temperature change is .
9.3 • Resistivity and Resistance 379
Solution
The resistance of the hotter filament R is obtained by entering known values into the above equation:
Significance
Notice that the resistance changes by more than a factor of 10 as the filament warms to the high temperature and
the current through the filament depends on the resistance of the filament and the voltage applied. If the filament is
used in an incandescent light bulb, the initial current through the filament when the bulb is first energized will be
higher than the current after the filament reaches the operating temperature.
CHECK YOUR UNDERSTANDING 9.6
A strain gauge is an electrical device to measure strain, as shown below. It consists of a flexible, insulating backing
that supports a conduction foil pattern. The resistance of the foil changes as the backing is stretched. How does the
strain gauge resistance change? Is the strain gauge affected by temperature changes?

![이미지](images/page018_img00.webp)

EXAMPLE 9.7
The Resistance of Coaxial Cable
Long cables can sometimes act like antennas, picking up electronic noise, which are signals from other equipment
and appliances. Coaxial cables are used for many applications that require this noise to be eliminated. For example,
they can be found in the home in cable TV connections or other audiovisual connections. Coaxial cables consist of
an inner conductor of radius surrounded by a second, outer concentric conductor with radius (Figure 9.18). The
space between the two is normally filled with an insulator such as polyethylene plastic. A small amount of radial
leakage current occurs between the two conductors. Determine the resistance of a coaxial cable of length L.
380 9 • Current and Resistance

![이미지](images/page019_img00.webp)

FIGURE 9.18 Coaxial cables consist of two concentric conductors separated by insulation. They are often used in cable TV or other
audiovisual connections.
Strategy
We cannot use the equation directly. Instead, we look at concentric cylindrical shells, with thickness dr,
and integrate.
Solution
We first find an expression for dR and then integrate from to ,
Significance
The resistance of a coaxial cable depends on its length, the inner and outer radii, and the resistivity of the material
separating the two conductors. Since this resistance is not infinite, a small leakage current occurs between the two
conductors. This leakage current leads to the attenuation (or weakening) of the signal being sent through the cable.
CHECK YOUR UNDERSTANDING 9.7
The resistance between the two conductors of a coaxial cable depends on the resistivity of the material separating
the two conductors, the length of the cable and the inner and outer radius of the two conductor. If you are designing
a coaxial cable, how does the resistance between the two conductors depend on these variables?
INTERACTIVE
View this simulation (https://openstax.org/l/21batteryresist) to see how the voltage applied and the resistance of
the material the current flows through affects the current through the material. You can visualize the collisions of
the electrons and the atoms of the material effect the temperature of the material.
9.4 Ohm's Law
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Describe Ohm’s law
• Recognize when Ohm’s law applies and when it does not
9.4 • Ohm's Law 381
We have been discussing three electrical properties so far in this chapter: current, voltage, and resistance. It turns
out that many materials exhibit a simple relationship among the values for these properties, known as Ohm’s law.
Many other materials do not show this relationship, so despite being called Ohm’s law, it is not considered a law of
nature, like Newton’s laws or the laws of thermodynamics. But it is very useful for calculations involving materials
that do obey Ohm’s law.
Description of Ohm’s Law
The current that flows through most substances is directly proportional to the voltage V applied to it. The German
physicist Georg Simon Ohm (1787–1854) was the first to demonstrate experimentally that the current in a metal
wire is directly proportional to the voltage applied:
This important relationship is the basis for Ohm’s law. It can be viewed as a cause-and-effect relationship, with
voltage the cause and current the effect. This is an empirical law, which is to say that it is an experimentally
observed phenomenon, like friction. Such a linear relationship doesn’t always occur. Any material, component, or
device that obeys Ohm’s law, where the current through the device is proportional to the voltage applied, is known
as an ohmic material or ohmic component. Any material or component that does not obey Ohm’s law is known as a
nonohmic material or nonohmic component.
Ohm’s Experiment
In a paper published in 1827, Georg Ohm described an experiment in which he measured voltage across and
current through various simple electrical circuits containing various lengths of wire. A similar experiment is shown in
Figure 9.19. This experiment is used to observe the current through a resistor that results from an applied voltage.
In this simple circuit, a resistor is connected in series with a battery. The voltage is measured with a voltmeter,
which must be placed across the resistor (in parallel with the resistor). The current is measured with an ammeter,
which must be in line with the resistor (in series with the resistor).

![이미지](images/page020_img00.webp)

FIGURE 9.19 The experimental set-up used to determine if a resistor is an ohmic or nonohmic device. (a) When the battery is attached, the
current flows in the clockwise direction and the voltmeter and ammeter have positive readings. (b) When the leads of the battery are
switched, the current flows in the counterclockwise direction and the voltmeter and ammeter have negative readings.
In this updated version of Ohm’s original experiment, several measurements of the current were made for several
different voltages. When the battery was hooked up as in Figure 9.19(a), the current flowed in the clockwise
direction and the readings of the voltmeter and ammeter were positive. Does the behavior of the current change if
the current flowed in the opposite direction? To get the current to flow in the opposite direction, the leads of the
battery can be switched. When the leads of the battery were switched, the readings of the voltmeter and ammeter
readings were negative because the current flowed in the opposite direction, in this case, counterclockwise. Results
of a similar experiment are shown in Figure 9.20.
382 9 • Current and Resistance

![이미지](images/page021_img00.webp)

FIGURE 9.20 A resistor is placed in a circuit with a battery. The voltage applied varies from −10.00 V to +10.00 V, increased by 1.00-V
increments. A plot shows values of the voltage versus the current typical of what a casual experimenter might find.
In this experiment, the voltage applied across the resistor varies from −10.00 to +10.00 V, by increments of 1.00 V.
The current through the resistor and the voltage across the resistor are measured. A plot is made of the voltage
versus the current, and the result is approximately linear. The slope of the line is the resistance, or the voltage
divided by the current. This result is known as Ohm’s law:
9.11
where V is the voltage measured in volts across the object in question, I is the current measured through the object
in amps, and R is the resistance in units of ohms. As stated previously, any device that shows a linear relationship
between the voltage and the current is known as an ohmic device. A resistor is therefore an ohmic device.
EXAMPLE 9.8
Measuring Resistance
A carbon resistor at room temperature is attached to a 9.00-V battery and the current measured through the
resistor is 3.00 mA. (a) What is the resistance of the resistor measured in ohms? (b) If the temperature of the
resistor is increased to by heating the resistor, what is the current through the resistor?
Strategy
(a) The resistance can be found using Ohm’s law. Ohm’s law states that , so the resistance can be found
using .
(b) First, the resistance is temperature dependent so the new resistance after the resistor has been heated can be
found using . The current can be found using Ohm’s law in the form .
Solution
a. Using Ohm’s law and solving for the resistance yields the resistance at room temperature:
b. The resistance at can be found using where the temperature coefficient for carbon
is . .
9.4 • Ohm's Law 383
The current through the heated resistor is
Significance
A change in temperature of resulted in a 2.00% change in current. This may not seem like a very great
change, but changing electrical characteristics can have a strong effect on the circuits. For this reason, many
electronic appliances, such as computers, contain fans to remove the heat dissipated by components in the electric
circuits.
CHECK YOUR UNDERSTANDING 9.8
The voltage supplied to your house varies as . If a resistor is connected across this voltage,
will Ohm’s law still be valid?
INTERACTIVE
See how the equation form of Ohm’s law relates to a simple circuit by engaging the simulation below. Adjust the
voltage and resistance, and see the current change according to Ohm’s law. The sizes of the symbols in the equation
change to match the circuit diagram.
Access multimedia content (https://openstax.org/l/21ohmslaw)
Nonohmic devices do not exhibit a linear relationship between the voltage and the current. One such device is the
semiconducting circuit element known as a diode. A diode is a circuit device that allows current flow in only one
direction. A diagram of a simple circuit consisting of a battery, a diode, and a resistor is shown in Figure 9.21.
Although we do not cover the theory of the diode in this section, the diode can be tested to see if it is an ohmic or a
nonohmic device.

![이미지](images/page022_img00.webp)

FIGURE 9.21 A diode is a semiconducting device that allows current flow only if the diode is forward biased, which means that the anode is
positive and the cathode is negative.
A plot of current versus voltage is shown in Figure 9.22. Note that the behavior of the diode is shown as current
versus voltage, whereas the resistor operation was shown as voltage versus current. A diode consists of an anode
and a cathode. When the anode is at a negative potential and the cathode is at a positive potential, as shown in part
(a), the diode is said to have reverse bias. With reverse bias, the diode has an extremely large resistance and there is
very little current flow—essentially zero current—through the diode and the resistor. As the voltage applied to the
circuit increases, the current remains essentially zero, until the voltage reaches the breakdown voltage and the
diode conducts current, as shown in Figure 9.22. When the battery and the potential across the diode are reversed,
making the anode positive and the cathode negative, the diode conducts and current flows through the diode if the
voltage is greater than 0.7 V. The resistance of the diode is close to zero. (This is the reason for the resistor in the
circuit; if it were not there, the current would become very large.) You can see from the graph in Figure 9.22 that the
384 9 • Current and Resistance
voltage and the current do not have a linear relationship. Thus, the diode is an example of a nonohmic device.

![이미지](images/page023_img00.webp)

FIGURE 9.22 When the voltage across the diode is negative and small, there is very little current flow through the diode. As the voltage
reaches the breakdown voltage, the diode conducts. When the voltage across the diode is positive and greater than 0.7 V (the actual
voltage value depends on the diode), the diode conducts. As the voltage applied increases, the current through the diode increases, but the
voltage across the diode remains approximately 0.7 V.
Ohm’s law is commonly stated as , but originally it was stated as a microscopic view, in terms of the current
density, the conductivity, and the electrical field. This microscopic view suggests the proportionality comes
from the drift velocity of the free electrons in the metal that results from an applied electrical field. As stated earlier,
the current density is proportional to the applied electrical field. The reformulation of Ohm’s law is credited to
Gustav Kirchhoff, whose name we will see again in the next chapter.
9.5 Electrical Energy and Power
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Express electrical power in terms of the voltage and the current
• Describe the power dissipated by a resistor in an electric circuit
• Calculate the energy efficiency and cost effectiveness of appliances and equipment
In an electric circuit, electrical energy is continuously converted into other forms of energy. For example, when a
current flows in a conductor, electrical energy is converted into thermal energy within the conductor. The electrical
field, supplied by the voltage source, accelerates the free electrons, increasing their kinetic energy for a short time.
This increased kinetic energy is converted into thermal energy through collisions with the ions of the lattice
structure of the conductor. In Work and Kinetic Energy (http://openstax.org/books/university-physics-volume-1/
pages/7-introduction), we defined power as the rate at which work is done by a force measured in watts. Power can
also be defined as the rate at which energy is transferred. In this section, we discuss the time rate of energy transfer,
or power, in an electric circuit.
Power in Electric Circuits
Power is associated by many people with electricity. Power transmission lines might come to mind. We also think of
light bulbs in terms of their power ratings in watts. What is the expression for electric power?
Let us compare a 25-W bulb with a 60-W bulb (Figure 9.23(a)). The 60-W bulb glows brighter than the 25-W bulb.
Although it is not shown, a 60-W light bulb is also warmer than the 25-W bulb. The heat and light is produced from
the conversion of electrical energy. The kinetic energy lost by the electrons in collisions is converted into the internal
energy of the conductor and radiation. How are voltage, current, and resistance related to electric power?
9.5 • Electrical Energy and Power 385

![이미지](images/page024_img00.webp)

FIGURE 9.23 (a) Pictured above are two incandescent bulbs: a 25-W bulb (left) and a 60-W bulb (right). The 60-W bulb provides a higher
intensity light than the 25-W bulb. The electrical energy supplied to the light bulbs is converted into heat and light. (b) This compact
fluorescent light (CFL) bulb puts out the same intensity of light as the 60-W bulb, but at 1/4 to 1/10 the input power. (credit a: modification
of works by “Dickbauch”/Wikimedia Commons and Greg Westfall; credit b: modification of work by “dbgg1979”/Flickr)
To calculate electric power, consider a voltage difference existing across a material (Figure 9.24). The electric
potential is higher than the electric potential at , and the voltage difference is . As discussed in
Electric Potential, an electrical field exists between the two potentials, which points from the higher potential to the
lower potential. Recall that the electrical potential is defined as the potential energy per charge, , and the
charge loses potential energy moving through the potential difference.

![이미지](images/page024_img01.webp)

FIGURE 9.24 When there is a potential difference across a conductor, an electrical field is present that points in the direction from the
higher potential to the lower potential.
If the charge is positive, the charge experiences a force due to the electrical field . This force is
necessary to keep the charge moving. This force does not act to accelerate the charge through the entire distance
because of the interactions of the charge with atoms and free electrons in the material. The speed, and
therefore the kinetic energy, of the charge do not increase during the entire trip across , and charge passing
through area has the same drift velocity as the charge that passes through area . However, work is done on
the charge, by the electrical field, which changes the potential energy. Since the change in the electrical potential
difference is negative, the electrical field is found to be
The work done on the charge is equal to the electric force times the length at which the force is applied,
The charge moves at a drift velocity so the work done on the charge results in a loss of potential energy, but the
average kinetic energy remains constant. The lost electrical potential energy appears as thermal energy in the
386 9 • Current and Resistance
material. On a microscopic scale, the energy transfer is due to collisions between the charge and the molecules of
the material, which leads to an increase in temperature in the material. The loss of potential energy results in an
increase in the temperature of the material, which is dissipated as radiation. In a resistor, it is dissipated as heat,
and in a light bulb, it is dissipated as heat and light.
The power dissipated by the material as heat and light is equal to the time rate of change of the work:
With a resistor, the voltage drop across the resistor is dissipated as heat. Ohm’s law states that the voltage across
the resistor is equal to the current times the resistance, . The power dissipated by the resistor is therefore
If a resistor is connected to a battery, the power dissipated as radiant energy by the wires and the resistor is equal
to . The power supplied from the battery is equal to current times the voltage, .
ELECTRIC POWER
The electric power gained or lost by any device has the form
9.12
The power dissipated by a resistor has the form
9.13
Different insights can be gained from the three different expressions for electric power. For example,
implies that the lower the resistance connected to a given voltage source, the greater the power delivered.
Furthermore, since voltage is squared in , the effect of applying a higher voltage is perhaps greater than
expected. Thus, when the voltage is doubled to a 25-W bulb, its power nearly quadruples to about 100 W, burning it
out. If the bulb’s resistance remained constant, its power would be exactly 100 W, but at the higher temperature, its
resistance is higher, too.
EXAMPLE 9.9
Calculating Power in Electric Devices
A DC winch motor is rated at 20.00 A with a voltage of 115 V. When the motor is running at its maximum power, it
can lift an object with a weight of 4900.00 N a distance of 10.00 m, in 30.00 s, at a constant speed. (a) What is the
power consumed by the motor? (b) What is the power used in lifting the object? Ignore air resistance. (c) Assuming
that the difference in the power consumed by the motor and the power used lifting the object are dissipated as heat
by the resistance of the motor, estimate the resistance of the motor?
Strategy
(a) The power consumed by the motor can be found using . (b) The power used in lifting the object at a
constant speed can be found using , where the speed is the distance divided by the time. The upward force
supplied by the motor is equal to the weight of the object because the acceleration is zero. (c) The resistance of the
motor can be found using .
Solution
a. The power consumed by the motor is equal to and the current is given as 20.00 A and the voltage is
115.00 V:
9.5 • Electrical Energy and Power 387
b. The power used lifting the object is equal to where the force is equal to the weight of the object (4900
N) and the magnitude of the velocity is ,
c. The difference in the power equals and the resistance can be found
using :
Significance
The resistance of the motor is quite small. The resistance of the motor is due to many windings of copper wire. The
power dissipated by the motor can be significant since the thermal power dissipated by the motor would be quite
large due to this small resistance; however, due to back emf, the current drawn by the motor is very small.
CHECK YOUR UNDERSTANDING 9.9
Electric motors have a reasonably high efficiency. A 100-hp motor can have an efficiency of 90% and a 1-hp motor
can have an efficiency of 80%. Why is it important to use high-performance motors?
A fuse (Figure 9.25) is a device that protects a circuit from currents that are too high. A fuse is basically a short piece
of wire between two contacts. As we have seen, when a current is running through a conductor, the kinetic energy of
the charge carriers is converted into thermal energy in the conductor. The piece of wire in the fuse is under tension
and has a low melting point. The wire is designed to heat up and break at the rated current. The fuse is destroyed
and must be replaced, but it protects the rest of the circuit. Fuses act quickly, but there is a small time delay while
the wire heats up and breaks.

![이미지](images/page026_img00.webp)

FIGURE 9.25 A fuse consists of a piece of wire between two contacts. When a current passes through the wire that is greater than the rated
current, the wire melts, breaking the connection. Pictured is a “blown” fuse where the wire broke protecting a circuit (credit: modification of
work by “Shardayyy”/Flickr).
Circuit breakers are also rated for a maximum current, and open to protect the circuit, but can be reset. Circuit
breakers react much faster. The operation of circuit breakers is not within the scope of this chapter and will be
discussed in later chapters. Another method of protecting equipment and people is the ground fault circuit
interrupter (GFCI), which is common in bathrooms and kitchens. The GFCI outlets respond very quickly to changes
in current. These outlets open when there is a change in magnetic field produced by current-carrying conductors,
which is also beyond the scope of this chapter and is covered in a later chapter.
The Cost of Electricity
The more electric appliances you use and the longer they are left on, the higher your electric bill. This familiar fact is
based on the relationship between energy and power. You pay for the energy used. Since , we see that
is the energy used by a device using power P for a time interval t. If power is delivered at a constant rate, then the
388 9 • Current and Resistance
energy can be found by . For example, the more light bulbs burning, the greater P used; the longer they are
on, the greater t is.
The energy unit on electric bills is the kilowatt-hour , consistent with the relationship . It is easy to
estimate the cost of operating electrical appliances if you have some idea of their power consumption rate in watts
or kilowatts, the time they are on in hours, and the cost per kilowatt-hour for your electric utility. Kilowatt-hours, like
all other specialized energy units such as food calories, can be converted into joules. You can prove to yourself that
.
The electrical energy (E) used can be reduced either by reducing the time of use or by reducing the power
consumption of that appliance or fixture. This not only reduces the cost but also results in a reduced impact on the
environment. Improvements to lighting are some of the fastest ways to reduce the electrical energy used in a home
or business. About 20% of a home’s use of energy goes to lighting, and the number for commercial establishments
is closer to 40%. Fluorescent lights are about four times more efficient than incandescent lights—this is true for both
the long tubes and the compact fluorescent lights (CFLs). (See Figure 9.23(b).) Thus, a 60-W incandescent bulb can
be replaced by a 15-W CFL, which has the same brightness and color. CFLs have a bent tube inside a globe or a
spiral-shaped tube, all connected to a standard screw-in base that fits standard incandescent light sockets. (Original
problems with color, flicker, shape, and high initial investment for CFLs have been addressed in recent years.)
The heat transfer from these CFLs is less, and they last up to 10 times longer than incandescent bulbs. The
significance of an investment in such bulbs is addressed in the next example. New white LEDs (which are clusters of
small LEDs) are even more efficient (twice that of CFLs) and last five times longer than CFLs.
EXAMPLE 9.10
Calculating the Cost Effectiveness of LEDs
The typical replacement for a 100-W incandescent bulb is a 20-W LED. The 20-W LED can provide the same amount
of light output as the 100-W incandescent light bulb. What is the cost savings for using the LED in place of the
incandescent bulb for one year, assuming $0.10 per kilowatt-hour is the average energy rate charged by the power
company? Assume that the bulb is turned on for three hours a day.
Strategy
(a) Calculate the energy used during the year for each bulb, using .
(b) Multiply the energy by the cost.
Solution
a. Calculate the power for each bulb.
b. Calculate the cost for each.
Significance
An LED uses 80% less energy than the incandescent bulb, saving $8.76 over the incandescent bulb for one year. The
LED can cost $20.00 and the 100-W incandescent bulb can cost $0.75, which should be calculated into the
computation. A typical lifespan of an incandescent bulb is 1200 hours and is 50,000 hours for the LED. The
incandescent bulb would last 1.08 years at 3 hours a day and the LED would last 45.66 years. The initial cost of the
LED is high, but the cost to the home owner will be $0.69 for the incandescent bulbs versus $0.44 for the LEDs per
year. (Note that the LEDs are coming down in price.) The cost savings per year is approximately $8.50, and that is
9.5 • Electrical Energy and Power 389
just for one bulb.
CHECK YOUR UNDERSTANDING 9.10
Is the efficiency of the various light bulbs the only consideration when comparing the various light bulbs?
Changing light bulbs from incandescent bulbs to CFL or LEDs is a simple way to reduce energy consumption in
homes and commercial sites. CFL bulbs operate with a much different mechanism than do incandescent lights. The
mechanism is complex and beyond the scope of this chapter, but here is a very general description of the
mechanism. CFL bulbs contain argon and mercury vapor housed within a spiral-shaped tube. The CFL bulbs use a
“ballast” that increases the voltage used by the CFL bulb. The ballast produce an electrical current, which passes
through the gas mixture and excites the gas molecules. The excited gas molecules produce ultraviolet (UV) light,
which in turn stimulates the fluorescent coating on the inside of the tube. This coating fluoresces in the visible
spectrum, emitting visible light. Traditional fluorescent tubes and CFL bulbs had a short time delay of up to a few
seconds while the mixture was being “warmed up” and the molecules reached an excited state. It should be noted
that these bulbs do contain mercury, which is poisonous, but if the bulb is broken, the mercury is never released.
Even if the bulb is broken, the mercury tends to remain in the fluorescent coating. The amount is also quite small
and the advantage of the energy saving may outweigh the disadvantage of using mercury.
The CFL light bulbs are being replaced with LEDs, where LED stands for “light-emitting diode.” The diode was briefly
discussed as a nonohmic device, made of semiconducting material, which essentially permits current flow in one
direction. LEDs are a special type of diode made of semiconducting materials infused with impurities in
combinations and concentrations that enable the extra energy from the movement of the electrons during electrical
excitation to be converted into visible light. Semiconducting devices will be explained in greater detail in Condensed
Matter Physics (http://openstax.org/books/university-physics-volume-3/pages/9-introduction).
Commercial LEDs are quickly becoming the standard for commercial and residential lighting, replacing incandescent
and CFL bulbs. They are designed for the visible spectrum and are constructed from gallium doped with arsenic and
phosphorous atoms. The color emitted from an LED depends on the materials used in the semiconductor and the
current. In the early years of LED development, small LEDs found on circuit boards were red, green, and yellow, but
LEDs can now be programmed to produce millions of colors of light as well as many different hues of white light.
Comparison of Incandescent Light Bulbs, CFL Light Bulbs, and LEDs
The energy savings can be significant when replacing an incandescent light bulb or a CFL light bulb with an LED.
Light bulbs are rated by the amount of power that the bulb consumes, and the amount of light output is measured in
lumens. The lumen (lm) is the SI -derived unit of luminous flux and is a measure of the total quantity of visible light
emitted by a source. A 60-W incandescent light bulb can be replaced with a 13- to 15-W CFL bulb or a 6- to 8-W
LED, all three of which have a light output of approximately 800 lm. A table of light output for some commonly used
light bulbs appears in Table 9.2.
The life spans of the three types of bulbs are significantly different. An LED has a life span of 50,000 hours, whereas
the CFL has a lifespan of 8000 hours and the incandescent lasts a mere 1200 hours. The LED is the most durable,
easily withstanding rough treatment such as jarring and bumping. The incandescent light bulb has little tolerance to
the same treatment since the filament and glass can easily break. The CFL bulb is also less durable than the LED
because of its glass construction. The amount of heat emitted is 3.4 btu/h for the 8-W LED, 85 btu/h for the 60-W
incandescent bulb, and 30 btu/h for the CFL bulb. As mentioned earlier, a major drawback of the CFL bulb is that it
contains mercury, a neurotoxin, and must be disposed of as hazardous waste. From these data, it is easy to
understand why the LED is quickly becoming the standard in lighting.
390 9 • Current and Resistance

| ght Output(lumens) | LEDs(watts) | Incandes | cent Lig(watts) | ht Bulbs | CFL | Light Bu(watts) |
| --- | --- | --- | --- | --- | --- | --- |
| 450 | 4−5 |  | 40 |  |  | 9−13 |
| 800 | 6−8 |  | 60 |  |  | 13−15 |
| 1100 | 9−13 |  | 75 |  |  | 18−25 |
| 1600 | 16−20 |  | 100 |  |  | 23−30 |
| 2600 | 25−28 |  | 150 |  |  | 30−55 |

Lig bs
TABLE 9.2 Light Output of LEDs, Incandescent, and CFL Light Bulbs
Summary of Relationships
In this chapter, we have discussed relationships between voltage, current, resistance, and power. Figure 9.26 shows
a summary of the relationships between these measurable quantities for ohmic devices. (Recall that ohmic devices
follow Ohm’s law .) For example, if you need to calculate the power, use the pink section, which shows that
, , and .

![이미지](images/page029_img00.webp)

FIGURE 9.26 This circle shows a summary of the equations for the relationships between power, current, voltage, and resistance.
Which equation you use depends on what values you are given, or you measure. For example if you are given the
current and the resistance, use . Although all the possible combinations may seem overwhelming, don’t
forget that they all are combinations of just two equations, Ohm’s law and power .
9.6 Superconductors
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Describe the phenomenon of superconductivity
• List applications of superconductivity
Touch the power supply of your laptop computer or some other device. It probably feels slightly warm. That heat is
an unwanted byproduct of the process of converting household electric power into a current that can be used by
your device. Although electric power is reasonably efficient, other losses are associated with it. As discussed in the
section on power and energy, transmission of electric power produces line losses. These line losses exist
whether the power is generated from conventional power plants (using coal, oil, or gas), nuclear plants, solar plants,
hydroelectric plants, or wind farms. These losses can be reduced, but not eliminated, by transmitting using a higher
9.6 • Superconductors 391
voltage. It would be wonderful if these line losses could be eliminated, but that would require transmission lines
that have zero resistance. In a world that has a global interest in not wasting energy, the reduction or elimination of
this unwanted thermal energy would be a significant achievement. Is this possible?
The Resistance of Mercury
In 1911, Heike Kamerlingh Onnes of Leiden University, a Dutch physicist, was looking at the temperature
dependence of the resistance of the element mercury. He cooled the sample of mercury and noticed the familiar
behavior of a linear dependence of resistance on temperature; as the temperature decreased, the resistance
decreased. Kamerlingh Onnes continued to cool the sample of mercury, using liquid helium. As the temperature
approached , the resistance abruptly went to zero (Figure 9.27). This temperature is known as the
critical temperature for mercury. The sample of mercury entered into a phase where the resistance was
absolutely zero. This phenomenon is known as superconductivity. (Note: If you connect the leads of a three-digit
ohmmeter across a conductor, the reading commonly shows up as . The resistance of the conductor is not
actually zero, it is less than .) There are various methods to measure very small resistances, such as the four-
point method, but an ohmmeter is not an acceptable method to use for testing resistance in superconductivity.

![이미지](images/page030_img00.webp)

FIGURE 9.27 The resistance of a sample of mercury is zero at very low temperatures—it is a superconductor up to the temperature of about
4.2 K. Above that critical temperature, its resistance makes a sudden jump and then increases nearly linearly with temperature.
Other Superconducting Materials
As research continued, several other materials were found to enter a superconducting phase, when the temperature
reached near absolute zero. In 1941, an alloy of niobium-nitride was found that could become superconducting at
and in 1953, vanadium-silicon was found to become superconductive at
The temperatures for the transition into superconductivity were slowly creeping higher.
Strangely, many materials that make good conductors, such as copper, silver, and gold, do not exhibit
superconductivity. Imagine the energy savings if transmission lines for electric power-generating stations could be
made to be superconducting at temperatures near room temperature! A resistance of zero ohms means no
losses and a great boost to reducing energy consumption. The problem is that is still very cold and in
the range of liquid helium temperatures. At this temperature, it is not cost effective to transmit electrical energy
because of the cooling requirements.
A large jump was seen in 1986, when a team of researchers, headed by Dr. Ching Wu Chu of Houston University,
fabricated a brittle, ceramic compound with a transition temperature of . The ceramic
material, composed of yttrium barium copper oxide (YBCO), was an insulator at room temperature. Although this
temperature still seems quite cold, it is near the boiling point of liquid nitrogen, a liquid commonly used in
refrigeration. You may have noticed refrigerated trucks traveling down the highway labeled as “Liquid Nitrogen
Cooled.”
YBCO ceramic is a material that could be useful for transmitting electrical energy because the cost saving of
reducing the losses are larger than the cost of cooling the superconducting cable, making it financially feasible.
There were and are many engineering problems to overcome. For example, unlike traditional electrical cables, which
are flexible and have a decent tensile strength, ceramics are brittle and would break rather than stretch under
392 9 • Current and Resistance
pressure. Processes that are rather simple with traditional cables, such as making connections, become difficult
when working with ceramics. The problems are difficult and complex, and material scientists and engineers are
coming up with innovative solutions.
An interesting consequence of the resistance going to zero is that once a current is established in a superconductor,
it persists without an applied voltage source. Current loops in a superconductor have been set up and the current
loops have been observed to persist for years without decaying.
Zero resistance is not the only interesting phenomenon that occurs as the materials reach their transition
temperatures. A second effect is the exclusion of magnetic fields. This is known as the Meissner effect (Figure
9.28). A light, permanent magnet placed over a superconducting sample will levitate in a stable position above the
superconductor. High-speed trains have been developed that levitate on strong superconducting magnets,
eliminating the friction normally experienced between the train and the tracks. In Japan, the Yamanashi Maglev test
line opened on April 3, 1997. In April 2015, the MLX01 test vehicle attained a speed of 374 mph (603 km/h).

![이미지](images/page031_img00.webp)

FIGURE 9.28 A small, strong magnet levitates over a superconductor cooled to liquid nitrogen temperature. The magnet levitates because
the superconductor excludes magnetic fields. (credit: Joseph J. Trout)
Table 9.3 shows a select list of elements, compounds, and high-temperature superconductors, along with the
critical temperatures for which they become superconducting. Each section is sorted from the highest critical
temperature to the lowest. Also listed is the critical magnetic field for some of the materials. This is the strength of
the magnetic field that destroys superconductivity. Finally, the type of the superconductor is listed.
There are two types of superconductors. There are 30 pure metals that exhibit zero resistivity below their critical
temperature and exhibit the Meissner effect, the property of excluding magnetic fields from the interior of the
superconductor while the superconductor is at a temperature below the critical temperature. These metals are
called Type I superconductors. The superconductivity exists only below their critical temperatures and below a
critical magnetic field strength. Type I superconductors are well described by the BCS theory (described next). Type
I superconductors have limited practical applications because the strength of the critical magnetic field needed to
destroy the superconductivity is quite low.
Type II superconductors are found to have much higher critical magnetic fields and therefore can carry much higher
current densities while remaining in the superconducting state. A collection of various ceramics containing barium-
copper-oxide have much higher critical temperatures for the transition into a superconducting state.
Superconducting materials that belong to this subcategory of the Type II superconductors are often categorized as
high-temperature superconductors.
Introduction to BCS Theory
Type I superconductors, along with some Type II superconductors can be modeled using the BCS theory, proposed
by John Bardeen, Leon Cooper, and Robert Schrieffer. Although the theory is beyond the scope of this chapter, a
short summary of the theory is provided here. (More detail is provided in Condensed Matter Physics
(http://openstax.org/books/university-physics-volume-3/pages/9-introduction).) The theory considers pairs of
electrons and how they are coupled together through lattice-vibration interactions. Through the interactions with
the crystalline lattice, electrons near the Fermi energy level feel a small attractive force and form pairs (Cooper
pairs), and the coupling is known as a phonon interaction. Single electrons are fermions, which are particles that
9.6 • Superconductors 393
obey the Pauli exclusion principle. The Pauli exclusion principle in quantum mechanics states that two identical
fermions (particles with half-integer spin) cannot occupy the same quantum state simultaneously. Each electron has
four quantum numbers . The principal quantum number (n) describes the energy of the electron, the
orbital angular momentum quantum number (l) indicates the most probable distance from the nucleus, the
magnetic quantum number describes the energy levels in the subshell, and the electron spin quantum number
describes the orientation of the spin of the electron, either up or down. As the material enters a
superconducting state, pairs of electrons act more like bosons, which can condense into the same energy level and
need not obey the Pauli exclusion principle. The electron pairs have a slightly lower energy and leave an energy gap
above them on the order of 0.001 eV. This energy gap inhibits collision interactions that lead to ordinary resistivity.
When the material is below the critical temperature, the thermal energy is less than the band gap and the material
exhibits zero resistivity.
Material Symbol or Formula Critical Temperature Critical Type
T (K) Magnetic Field
c
H (T)
c
Elements

| Pb | 7.19 | 0.08 |
| --- | --- | --- |
| La | ( ) 4.90 − ( ) 6.30 |  |
| Ta | 4.48 | 0.09 |
| Hg | ( ) 4.15 − ( ) 3.95 | 0.04 |
| Sn | 3.72 | 0.03 |
| In | 3.40 | 0.03 |
| Tl | 2.39 | 0.03 |
| Re | 2.40 | 0.03 |
| Th | 1.37 | 0.013 |
| Pa | 1.40 |  |
| Al | 1.20 | 0.01 |
| Ga | 1.10 | 0.005 |
| Zn | 0.86 | 0.014 |
| Ti | 0.39 | 0.01 |
| U | ( ) 0.68 − ( ) 1.80 |  |
| Cd | 11.4 | 4.00 |

Lead I
Lanthanum I
Tantalum I
Mercury I
Tin I
Indium I
Thallium I
Rhenium I
Thorium I
Protactinium I
Aluminum I
Gallium I
Zinc I
Titanium I
Uranium I
Cadmium I
Compounds
TABLE 9.3 Superconductor Critical Temperatures
394 9 • Current and Resistance
Material Symbol or Formula Critical Temperature Critical Type
T (K) Magnetic Field
c
H (T)
c

| Nb3Ge | 23.20 | 37.00 |
| --- | --- | --- |
| Nb3Sn | 18.30 | 30.00 |
| NbN | 16.00 |  |
| NbTi | 10.00 | 15.00 |

Niobium-germanium II
Niobium-tin II
Niobium-nitrite II
Niobium-titanium II
High-Temperature Oxides

| HgBa2CaCu2O8 | 134.00 |  |
| --- | --- | --- |
| Tl2Ba2Ca2Cu3O10 | 125.00 |  |
| YBa2Cu3O7 | 92.00 | 120.00 |

II
II
II
TABLE 9.3 Superconductor Critical Temperatures
Applications of Superconductors
Superconductors can be used to make superconducting magnets. These magnets are 10 times stronger than the
strongest electromagnets. These magnets are currently in use in magnetic resonance imaging (MRI), which
produces high-quality images of the body interior without dangerous radiation.
Another interesting application of superconductivity is the SQUID (superconducting quantum interference device).
A SQUID is a very sensitive magnetometer used to measure extremely subtle magnetic fields. The operation of the
SQUID is based on superconducting loops containing Josephson junctions. A Josephson junction is the result of a
theoretical prediction made by B. D. Josephson in an article published in 1962. In the article, Josephson described
how a supercurrent can flow between two pieces of superconductor separated by a thin layer of insulator. This
phenomenon is now called the Josephson effect. The SQUID consists of a superconducting current loop containing
two Josephson junctions, as shown in Figure 9.29. When the loop is placed in even a very weak magnetic field, there
is an interference effect that depends on the strength of the magnetic field.
9.6 • Superconductors 395

![이미지](images/page034_img00.webp)

FIGURE 9.29 The SQUID (superconducting quantum interference device) uses a superconducting current loop and two Josephson
junctions to detect magnetic fields as low as (Earth’s magnet field is on the order of ).
Superconductivity is a fascinating and useful phenomenon. At critical temperatures near the boiling point of liquid
nitrogen, superconductivity has special applications in MRIs, particle accelerators, and high-speed trains. Will we
reach a state where we can have materials enter the superconducting phase at near room temperatures? It seems a
long way off, but if scientists in 1911 were asked if we would reach liquid-nitrogen temperatures with a ceramic,
they might have thought it implausible.
396 9 • Chapter Review
Chapter Review
Key Terms
ampere (amp) SI unit for current; Meissner effect phenomenon that occurs in a
circuit complete path that an electrical current superconducting material where all magnetic fields
travels along are expelled
conventional current current that flows through a nonohmic type of a material for which Ohm’s law is
circuit from the positive terminal of a battery not valid
through the circuit to the negative terminal of the ohm unit of electrical resistance,
battery Ohm’s law empirical relation stating that the current
critical temperature temperature at which a material I is proportional to the potential difference V; it is
reaches superconductivity often written as , where R is the resistance
current density flow of charge through a cross- ohmic type of a material for which Ohm’s law is valid,
sectional area divided by the area that is, the voltage drop across the device is equal to
diode nonohmic circuit device that allows current the current times the resistance
flow in only one direction resistance electric property that impedes current; for
drift velocity velocity of a charge as it moves nearly ohmic materials, it is the ratio of voltage to current,
randomly through a conductor, experiencing
multiple collisions, averaged over a length of a resistivity intrinsic property of a material,
conductor, whose magnitude is the length of independent of its shape or size, directly
conductor traveled divided by the time it takes for proportional to the resistance, denoted by
the charges to travel the length schematic graphical representation of a circuit using
electrical conductivity measure of a material’s ability standardized symbols for components and solid
to conduct or transmit electricity lines for the wire connecting the components
electrical current rate at which charge flows, SQUID (Superconducting Quantum Interference
Device) device that is a very sensitive
magnetometer, used to measure extremely subtle
electrical power time rate of change of energy in an
magnetic fields
electric circuit
superconductivity phenomenon that occurs in some
Josephson junction junction of two pieces of
materials where the resistance goes to exactly zero
superconducting material separated by a thin layer
and all magnetic fields are expelled, which occurs
of insulating material, which can carry a
dramatically at some low critical temperature
supercurrent
Key Equations
Average electrical current
Definition of an ampere
Electrical current
Drift velocity
Current density
Resistivity
Common expression of Ohm’s law
Resistivity as a function of temperature
Definition of resistance
Resistance of a cylinder of material
Temperature dependence of resistance
Electric power
Power dissipated by a resistor
9 • Chapter Review 397
Summary
9.1 Electrical Current cross-sectional area A is , where is the
resistivity of the material.
• The average electrical current is the rate at
• Values of in Table 9.1 show that materials fall
which charge flows, given by , where
into three groups—conductors, semiconductors,
is the amount of charge passing through an
and insulators.
area in time .
• Temperature affects resistivity; for relatively
• The instantaneous electrical current, or simply
small temperature changes , resistivity is
the current I, is the rate at which charge flows.
, where is the original
Taking the limit as the change in time approaches
resistivity and is the temperature coefficient of
zero, we have , where is the time
resistivity.
derivative of the charge. • The resistance R of an object also varies with
• The direction of conventional current is taken as temperature: , where is
the direction in which positive charge moves. In a the original resistance, and R is the resistance
simple direct-current (DC) circuit, this will be after the temperature change.
from the positive terminal of the battery to the
9.4 Ohm's Law
negative terminal.
• The SI unit for current is the ampere, or simply • Ohm’s law is an empirical relationship for
the amp (A), where . current, voltage, and resistance for some
• Current consists of the flow of free charges, such common types of circuit elements, including
as electrons, protons, and ions. resistors. It does not apply to other devices, such
as diodes.
9.2 Model of Conduction in Metals
• One statement of Ohm’s law gives the
• The current through a conductor depends mainly relationship among current I, voltage V, and
on the motion of free electrons. resistance R in a simple circuit as .
• When an electrical field is applied to a conductor, • Another statement of Ohm’s law, on a
the free electrons in a conductor do not move microscopic level, is .
through a conductor at a constant speed and
9.5 Electrical Energy and Power
direction; instead, the motion is almost random
due to collisions with atoms and other free • Electric power is the rate at which electric energy
electrons. is supplied to a circuit or consumed by a load.
• Even though the electrons move in a nearly • Power dissipated by a resistor depends on the
random fashion, when an electrical field is square of the current through the resistor and is
applied to the conductor, the overall velocity of
equal to .
the electrons can be defined in terms of a drift
• The SI unit for electric power is the watt and the
velocity.
SI unit for electric energy is the joule. Another
• The current density is a vector quantity defined
common unit for electric energy, used by power
as the current through an infinitesimal area
companies, is the kilowatt-hour (kW h).
divided by the area.
• The total energy used over a time interval can be
• The current can be found from the current
found by .
density, .
9.6 Superconductors
• An incandescent light bulb is a filament of wire
enclosed in a glass bulb that is partially • Superconductivity is a phenomenon that occurs
evacuated. Current runs through the filament, in some materials when cooled to very low
where the electrical energy is converted to light critical temperatures, resulting in a resistance of
and heat. exactly zero and the expulsion of all magnetic
fields.
9.3 Resistivity and Resistance
• Materials that are normally good conductors
• Resistance has units of ohms , related to volts (such as copper, gold, and silver) do not
and amperes by . experience superconductivity.
• The resistance R of a cylinder of length L and • Superconductivity was first observed in mercury
398 9 • Chapter Review
by Heike Kamerlingh Onnes in 1911. In 1986, Dr. nitrogen.
Ching Wu Chu of Houston University fabricated a • Superconductivity can be used in the
brittle, ceramic compound with a critical manufacture of superconducting magnets for use
temperature close to the temperature of liquid in MRIs and high-speed, levitated trains.
Conceptual Questions
9.1 Electrical Current in Table 9.1 supply free charges? (Hint: Examine

| Can a wire carryneutral—that is,Explain.Car batteries arTo what physicacorrespond (volpower,…)?When working wit is advised tha“one-handed” opocket.” Why isodel of Conducti | a have rated quantity (voltage, with or “keep this a in |
| --- | --- |
| Incandescent limore efficient Lany obvious evibulbs might notenergy converteIt was stated thappears nearly ris applied to themotion nearly rathe random motElectric circuitsconceptual modpipe. In this consource is represwater through pcomponents in tof water flowingrepresentationand wires similaHow are they diAn incandescenevacuated. Whyesistivity and Re | ght bED andencebe thd intat theandocondndoion oare sel ofceptenteipeshe cithroof ther tofferet lighdo ysista |

the range of resistivity for each and determine
1 . rent and still be
whether the pure semiconductor has the higher
a total charge of zero?
or lower conductivity.)
10 . Does the resistance of an object depend on the path
2 . d in ampere-hours .
current takes through it? Consider, for example, a
ntity do ampere-hours
rectangular bar—is its resistance the same along its
current, charge, energy,
length as across its width?

![이미지](images/page037_img00.webp)

3 . igh-power electric circuits,
never possible, you work
p one hand in your
sensible suggestion?
9.2 M Metals
4 . lbs are being replaced with
11 . If aluminum and copper wires of the same
d CFL light bulbs. Is there
length have the same resistance, which has the
that incandescent light
larger diameter? Why?
at energy efficient? Is
anything but visible light? 9.4 Ohm's Law
5 . motion of an electron 12 . In Determining Field from Potential, resistance
m when an electrical field was defined as . In this section, we
uctor. What makes the
presented Ohm’s law, which is commonly
and differentiates it from
expressed as . The equations look
f molecules in a gas?
exactly alike. What is the difference between
6 . metimes explained using a Ohm’s law and the definition of resistance?
water flowing through a
13 . Shown below are the results of an experiment
al model, the voltage
where four devices were connected across a
as a pump that pumps
variable voltage source. The voltage is increased
nd the pipes connect
and the current is measured. Which device, if
rcuit. Is a conceptual model
any, is an ohmic device?
gh a pipe an adequate

![이미지](images/page037_img01.webp)

circuit? How are electrons
ater molecules and pipes?
t?
7 . bulb is partially
u suppose that is?
9.3 R ce
8 . The IR drop across a resistor means that there is
a change in potential or voltage across the
resistor. Is there any change in current as it
passes through a resistor? Explain.
14 . The current I is measured through a sample of
9 . Do impurities in semiconducting materials listed an ohmic material as a voltage V is applied. (a)
9 • Chapter Review 399
What is the current when the voltage is doubled 17 . Resistors are commonly rated at , ,
to 2V (assume the change in temperature of the
, 1 W and 2 W for use in electrical circuits. If
material is negligible)? (b) What is the voltage
a current of is accidentally passed
applied is the current measured is 0.2I (assume
through a resistor rated at 1 W,
the change in temperature of the material is
what would be the most probable outcome? Is
negligible)? What will happen to the current if
there anything that can be done to prevent such
the material if the voltage remains constant, but
an accident?
the temperature of the material increases
significantly? 18 . An immersion heater is a small appliance used
to heat a cup of water for tea by passing current
9.5 Electrical Energy and Power
through a resistor. If the voltage applied to the
15 . Common household appliances are rated at 110 appliance is doubled, will the time required to
V, but power companies deliver voltage in the heat the water change? By how much? Is this a
kilovolt range and then step the voltage down good idea?
using transformers to 110 V to be used in
9.6 Superconductors
homes. You will learn in later chapters that
transformers consist of many turns of wire, 19 . What requirement for superconductivity makes
which warm up as current flows through them, current superconducting devices expensive to
wasting some of the energy that is given off as operate?
heat. This sounds inefficient. Why do the power
20 . Name two applications for superconductivity
companies transport electric power using this
listed in this section and explain how
method?
superconductivity is used in the application. Can
16 . Your electric bill gives your consumption in units you think of a use for superconductivity that is
of kilowatt-hour (kW h). Does this unit not listed?
represent the amount of charge, current,
voltage, power, or energy you buy?
Problems
9.1 Electrical Current crystal display (LCD) or plasma screen. You still
may come across a CRT in your study of science.
21 . A Van de Graaff generator is one of the original
Consider a CRT with an electron beam average
particle accelerators and can be used to
current of . How many electrons strike
accelerate charged particles like protons or
the screen every minute?
electrons. You may have seen it used to make
human hair stand on end or produce large 23 . How many electrons flow through a point in a
sparks. One application of the Van de Graaff wire in 3.00 s if there is a constant current of
generator is to create X-rays by bombarding a ?
hard metal target with the beam. Consider a
24 . A conductor carries a current that is decreasing
beam of protons at 1.00 keV and a current of
exponentially with time. The current is modeled
5.00 mA produced by the generator. (a) What is
as , where is the
the speed of the protons? (b) How many protons
current at time and is the
are produced each second?
time constant. How much charge flows through
22 . A cathode ray tube (CRT) is a device that the conductor between and ?
produces a focused beam of electrons in a
25 . The quantity of charge through a conductor is
vacuum. The electrons strike a phosphor-coated
modeled as
glass screen at the end of the tube, which
.
produces a bright spot of light. The position of
the bright spot of light on the screen can be What is the current at time ?
adjusted by deflecting the electrons with
26 . The current through a conductor is modeled as
electrical fields, magnetic fields, or both.
. Write an equation
Although the CRT tube was once commonly
for the charge as a function of time.
found in televisions, computer displays, and
oscilloscopes, newer appliances use a liquid 27 . The charge on a capacitor in a circuit is modeled
400 9 • Chapter Review
as . What is the 9.3 Resistivity and Resistance
current through the circuit as a function of time?
34 . What current flows through the bulb of a 3.00-V
9.2 Model of Conduction in Metals flashlight when its hot resistance is ?
28 . An aluminum wire 1.628 mm in diameter 35 . Calculate the effective resistance of a pocket
(14-gauge) carries a current of 3.00 amps. (a) calculator that has a 1.35-V battery and through
What is the absolute value of the charge density which 0.200 mA flows.
in the wire? (b) What is the drift velocity of the
36 . How many volts are supplied to operate an
electrons? (c) What would be the drift velocity if
indicator light on a DVD player that has a
the same gauge copper were used instead of
resistance of , given that 25.0 mA passes
aluminum? The density of copper is
through it?
and the density of aluminum is . The
molar mass of aluminum is 26.98 g/mol and the 37 . What is the resistance of a 20.0-m-long piece of
molar mass of copper is 63.5 g/mol. Assume 12-gauge copper wire having a 2.053-mm
each atom of metal contributes one free diameter?
electron.
38 . The diameter of 0-gauge copper wire is 8.252
29 . The current of an electron beam has a measured mm. Find the resistance of a 1.00-km length of
current of with a radius of 1.00 such wire used for power transmission.
mm. What is the magnitude of the current
39 . If the 0.100-mm-diameter tungsten filament in
density of the beam?
a light bulb is to have a resistance of at
30 . A high-energy proton accelerator produces a , how long should it be?
proton beam with a radius of . The
40 . A lead rod has a length of 30.00 cm and a
beam current is and is constant.
resistance of . What is the radius of the
The charge density of the beam is
rod?
protons per cubic meter. (a)
What is the current density of the beam? (b) 41 . Find the ratio of the diameter of aluminum to
What is the drift velocity of the beam? (c) How copper wire, if they have the same resistance
much time does it take for protons per unit length (as they might in household
to be emitted by the accelerator? wiring).
31 . Consider a wire of a circular cross-section with a 42 . What current flows through a 2.54-cm-diameter
radius of . The magnitude of the rod of pure silicon that is 20.0 cm long, when
current density is modeled as is applied to it? (Such a rod may
. What is the be used to make nuclear-particle detectors, for
example.)
current through the inner section of the wire
from the center to ? 43 . (a) To what temperature must you raise a copper
wire, originally at , to double its
32 . A cylindrical wire has a current density from the
resistance, neglecting any changes in
center of the wire’s cross section as
dimensions? (b) Does this happen in household
where is in meters, is in amps per square
wiring under ordinary circumstances?
meter, and . This current density
44 . A resistor made of nichrome wire is used in an
continues to the end of the wire at a radius of
application where its resistance cannot change
1.0 mm. Calculate the current just outside of this
more than 1.00% from its value at . Over
wire.
what temperature range can it be used?
33 . The current supplied to an air conditioner unit is
45 . Of what material is a resistor made if its
4.00 amps. The air conditioner is wired using a
resistance is 40.0% greater at than at
10-gauge (diameter 2.588 mm) wire. The charge
?
density is . Find the
magnitude of (a) current density and (b) the drift 46 . An electronic device designed to operate at any
velocity. temperature in the range from to
contains pure carbon resistors. By what
factor does their resistance increase over this
9 • Chapter Review 401
range?

|  |  | V(V) |  |  |
| --- | --- | --- | --- | --- |
| 0 |  |  | 3 |  |
| 2 |  |  | 23 |  |
| 4 |  |  | 39 |  |
| 6 |  |  | 58 |  |
| 8 |  |  | 77 |  |
| 10 |  |  | 100 |  |
| 12 |  |  | 119 |  |
| 14 |  |  | 142 |  |
| 16 |  |  | 162 |  |
| y a | nd P | Power |  |  |
| tteor.d furrowowther?thax | is Assume for current input electrical (d) What the resistor? maximum | used to supply the voltage connections is through the dissipated by the input from the electrical power is What happens to resistor? voltage that | current to drop across negligible. (a) resistor? (b) resistor? battery, dissipated to the energy can be |  |
| einhroge omae tot-edeslb.nghounessi | designed of make the to CFL light-emitting Both the cost how year if dissipated | designed that uses wire to generate . How the wire? bulbs and diode (LED) bulb can be produce 1600 cost of electricity much does it if it runs for four by a resistor | a coil of 300 W long should incandescent bulbs. A replaced by lumens of is $0.10 it cost to run four hours a with a |  |

47 . (a) Of what material is a wire made, if it is 25.0 m I(A)
long with a diameter of 0.100 mm and has a
resistance of at ? (b) What is its
resistance at
48 . Assuming a constant temperature coefficient of
resistivity, what is the maximum percent
decrease in the resistance of a constantan wire
starting at and reaching 0 K?
49 . A copper wire has a resistance of at
and an iron wire has a resistance of
at the same temperature. At what
temperature are their resistances equal? 1
9.4 Ohm's Law
1
50 . A resistor is connected across a D cell
battery (1.5 V). What is the current through the 1
resistor?
1
51 . A resistor rated at is connected across
two D cell batteries (each 1.50 V) in series, with
a total voltage of 3.00 V. The manufacturer 9.5 Electrical Energ
advertises that their resistors are within 5% of
55 . A ba
the rated value. What are the possible minimum
resist
current and maximum current through the
any wires use
resistor?
What is the cu
52 . A resistor is connected in series with a power What is the p
supply of 20.00 V. The current measure is 0.50 What is the p
A. What is the resistance of the resistor? assuming all
by the resisto
53 . A resistor is placed in a circuit with an adjustable
dissipated by
voltage source. The voltage across and the
current through the resistor and the 56 . What is the m
measurements are shown below. Estimate the applied to a
resistance of the resistor.
57 . A heater is be

![이미지](images/page040_img00.webp)

14-gauge nic
using a voltag
the engineer
58 . An alternative
bulbs are ligh
100-W incand
16-W LED bu
light. Assumin
per kilowatt-h
the bulb for o
day?
54 . The following table show the measurements of a
59 . The power dis
current through and the voltage across a sample of
resistance of is . What
material. Plot the data, and assuming the object is an
are the current through and the voltage drop
ohmic device, estimate the resistance.
across the resistor?
402 9 • Chapter Review
60 . Running late to catch a plane, a driver more power is dissipated in the copper wires
accidentally leaves the headlights on after than it would be in superconducting wires?
parking the car in the airport parking lot. During
64 . A wire is drawn through a die, stretching it to
takeoff, the driver realizes the mistake. Having
four times its original length. By what factor
just replaced the battery, the driver knows that
does its resistance increase?
the battery is a 12-V automobile battery, rated at
100 . The driver, knowing there is nothing 65 . Digital medical thermometers determine
that can be done, estimates how long the lights temperature by measuring the resistance of a
will shine, assuming there are two 12-V semiconductor device called a thermistor (which
headlights, each rated at 40 W. What did the has ) when it is at the same
driver conclude? temperature as the patient. What is a patient’s
temperature if the thermistor’s resistance at
61 . A physics student has a single-occupancy dorm
that temperature is 82.0% of its value at
room. The student has a small refrigerator that
(normal body temperature)?
runs with a current of 3.00 A and a voltage of
110 V, a lamp that contains a 100-W bulb, an 66 . Electrical power generators are sometimes
overhead light with a 60-W bulb, and various “load tested” by passing current through a large
other small devices adding up to 3.00 W. (a) vat of water. A similar method can be used to
Assuming the power plant that supplies 110 V test the heat output of a resistor. A
electricity to the dorm is 10 km away and the resistor is connected to a 9.0-V battery and the
two aluminum transmission cables use 0-gauge resistor leads are waterproofed and the resistor
wire with a diameter of 8.252 mm, estimate the is placed in 1.0 kg of room temperature water
percentage of the total power supplied by the . Current runs through the resistor
power company that is lost in the transmission. for 20 minutes. Assuming all the electrical
(b) What would be the result is the power energy dissipated by the resistor is converted to
company delivered the electric power at 110 kV? heat, what is the final temperature of the water?
62 . A 0.50-W, resistor carries the maximum 67 . A 12-gauge gold wire has a length of 1 meter. (a)
current possible without damaging the resistor. What would be the length of a silver 12-gauge
If the current were reduced to half the value, wire with the same resistance? (b) What are
what would be the power consumed? their respective resistances at the temperature
of boiling water?
9.6 Superconductors
68 . What is the change in temperature required to
63 . Consider a power plant is located 60 km away
decrease the resistance for a carbon resistor by
from a residential area uses 0-gauge
10%?
wire of copper to transmit
power at a current of . How much
Additional Problems
69 . A coaxial cable consists of an inner conductor 71 . A nichrome rod that is 3.00 mm long with a
with radius and an outer radius of cross-sectional area of is used for a
and has a length of 10 meters. digital thermometer. (a) What is the resistance at
Plastic, with a resistivity of room temperature? (b) What is the resistance at
, separates the two body temperature?
conductors. What is the resistance of the cable?
72 . The temperature in Philadelphia, PA can vary
70 . A 10.00-meter long wire cable that is made of between and in one summer
copper has a resistance of 0.051 ohms. (a) What day. By what percentage will an aluminum wire’s
is the weight if the wire was made of copper? (b) resistance change during the day?
What is the weight of a 10.00-meter-long wire of
73 . When 100.0 V is applied across a 5-gauge
the same gauge made of aluminum? (c)What is
(diameter 4.621 mm) wire that is 10 m long, the
the resistance of the aluminum wire? The
magnitude of the current density is
density of copper is and the density
. What is the resistivity of the
of aluminum is .
wire?
9 • Chapter Review 403
74 . A wire with a resistance of is drawn out can be approximately . (a) What voltage
through a die so that its new length is twice can cause 0.06 A through a dry human body? (b)
times its original length. Find the resistance of When a human body is wet, the resistance can
the longer wire. You may assume that the fall to . What voltage can cause harm to a
resistivity and density of the material are wet body?
unchanged.
78 . A 20.00-ohm, 5.00-watt resistor is placed in
75 . What is the resistivity of a wire of 5-gauge wire series with a power supply. (a) What is the
), 5.00 m length, and maximum voltage that can be applied to the
resistance? resistor without harming the resistor? (b) What
would be the current through the resistor?
76 . Coils are often used in electrical and electronic
circuits. Consider a coil which is formed by 79 . A battery with an emf of 24.00 V delivers a
winding 1000 turns of insulated 20-gauge constant current of 2.00 mA to an appliance.
copper wire (area in a single layer on How much work does the battery do in three
a cylindrical non-conducting core of radius 2.0 minutes?
mm. What is the resistance of the coil? Neglect
80 . A 12.00-V battery has an internal resistance of a
the thickness of the insulation.
tenth of an ohm. (a) What is the current if the
77 . Currents of approximately 0.06 A can be battery terminals are momentarily shorted
potentially fatal. Currents in that range can make together? (b) What is the terminal voltage if the
the heart fibrillate (beat in an uncontrolled battery delivers 0.25 amps to a circuit?
manner). The resistance of a dry human body
Challenge Problems
81 . A 10-gauge copper wire has a cross-sectional supplied a current that alternated as a sine
area and carries a current of wave, for example,
. The density of copper is . (a) What would a
. One mole of copper atoms graph of the voltage drop across the resistor V(t)
has a mass of versus time look like? (b) What would a plot of
approximately 63.50 g. What is the magnitude of V(t) versus I(t) for one period look like? (Hint: If
the drift velocity of the electrons, assuming that you are not sure, try plotting V(t) versus I(t)
each copper atom contributes one free electron using a spreadsheet.)
to the current?
85 . A current of is drawn from a 100-V
82 . The current through a 12-gauge wire is given as battery for 30 seconds. By how much is the
. What is the chemical energy reduced?
current density at time 15.00 ms?
86 . Consider a square rod of material with sides of
83 . A particle accelerator produces a beam with a length with a current density of
radius of 1.25 mm with a current of 2.00 mA.
Each proton has a kinetic energy of 10.00 MeV.
(a) What is the velocity of the protons? (b) What as shown below. Find the current that passes
is the number (n) of protons per unit volume? (b) through the face of the rod.
How many electrons pass a cross sectional area
each second?
84 . In this chapter, most examples and problems
involved direct current (DC). DC circuits have the
current flowing in one direction, from positive to
negative. When the current was changing, it was
changed linearly from to
and the voltage changed linearly from
to , where
. Suppose a voltage source is
placed in series with a resistor of that
404 9 • Chapter Review

![이미지](images/page043_img00.webp)

![이미지](images/page043_img01.webp)

90 . What is the current through a cylindrical wire of
radius if the current density is
, where
91 . A student uses a 100.00-W, 115.00-V radiant
heater to heat the student’s dorm room, during
the hours between sunset and sunrise, 6:00
87 . A resistor of an unknown resistance is placed in p.m. to 7:00 a.m. (a) What current does the
an insulated container filled with 0.75 kg of heater operate at? (b) How many electrons move
water. A voltage source is connected in series through the heater? (c) What is the resistance of
with the resistor and a current of 1.2 amps flows the heater? (d) How much heat was added to the
through the resistor for 10 minutes. During this dorm room?
time, the temperature of the water is measured
92 . A 12-V car battery is used to power a 20.00-W,
and the temperature change during this time is
12.00-V lamp during the physics club camping
. (a) What is the resistance of the
trip/star party. The cable to the lamp is 2.00
resistor? (b) What is the voltage supplied by the
meters long, 14-gauge copper wire with a
power supply?
charge density of . (a)
88 . The charge that flows through a point in a wire What is the current draw by the lamp? (b) How
as a function of time is modeled as long would it take an electron to get from the
. (a) What is the battery to the lamp?
initial current through the wire at time
93 . A physics student uses a 115.00-V immersion
? (b) Find the current at time .
heater to heat 400.00 grams (almost two cups)
(c) At what time t will the current be reduced by
of water for herbal tea. During the two minutes it
one-half ?
takes the water to heat, the physics student
becomes bored and decides to figure out the
89 . Consider a resistor made from a hollow cylinder
resistance of the heater. The student starts with
of carbon as shown below. The inner radius of
the assumption that the water is initially at the
the cylinder is and the outer
temperature of the room and
radius is . The length of the
reaches . The specific heat of
resistor is . The resistivity of the
carbon is . (a) Prove that the water is . What is the
the resistance perpendicular from the axis is resistance of the heater?
(b) What is the resistance?
CHAPTER 10
Direct-Current Circuits

![이미지](images/page044_img00.webp)

| FIGURE 10.1 This circuit shown is used to amplify small signals and power the earbud speakers attached to a cellular phone. Thiscircuit’s components include resistors, capacitors, and diodes, all of which have been covered in previous chapters, as well as transistors,which are semi-conducting devices covered in Condensed Matter Physics (http://openstax.org/books/university-physics-volume-3/pages/9-introduction). Circuits using similar components are found in all types of equipment and appliances you encounter in everydaylife, such as alarm clocks, televisions, computers, and refrigerators. |
| --- |

CHAPTER OUTLINE
10.1 Electromotive Force
10.2 Resistors in Series and Parallel
10.3 Kirchhoff's Rules
10.4 Electrical Measuring Instruments
10.5 RC Circuits
10.6 Household Wiring and Electrical Safety
INTRODUCTION In the preceding few chapters, we discussed electric components, including capacitors, resistors,
and diodes. In this chapter, we use these electric components in circuits. A circuit is a collection of electrical
components connected to accomplish a specific task. Figure 10.1 shows an amplifier circuit, which takes a small-
amplitude signal and amplifies it to power the speakers in earbuds. Although the circuit looks complex, it actually
consists of a set of series, parallel, and series-parallel circuits. The second section of this chapter covers the
analysis of series and parallel circuits that consist of resistors. Later in this chapter, we introduce the basic
equations and techniques to analyze any circuit, including those that are not reducible through simplifying parallel
and series elements. But first, we need to understand how to power a circuit.
406 10 • Direct-Current Circuits
10.1 Electromotive Force
LEARNING OBJECTIVES
By the end of the section, you will be able to:
• Describe the electromotive force (emf) and the internal resistance of a battery
• Explain the basic operation of a battery
Battery life is an essential consideration for every user of mobile phones, laptop computers, and electric vehicles.
The reliability of a battery and its ability to hold a charge can impact every aspect of our day. For many people,
battery reliability is even more important.
Each year, over 300,000 implantable cardioverter defibrillators (ICDs) are surgically provided to people at risk of
sudden and life-threatening arrythmia, such as a heart beating too fast or irregularly. Similar to (and sometimes
combined with) pacemakers, ICDs monitor patients' hearts and deliver electrical shocks to correct iregular activity.
Since they must function properly at all times, battery life and reliability are critically important. Early ICDs had
minimal power output and brief battery lives, which required frequent surgical replacement and made them
impractical.
Esther Sans Takeuchi began addressing this problem in the 1980s, when she experimented with new chemical
compositions and designs to increase the power and reliability of ICD and similar batteries. Her initial lithium-silver
vanadium oxide batteries increased longevity and power output, making ICDs a viable option for hundreds of
thousands of people. Takeuchi eventually became the chief scientist at the Department of Energy's Brookhaven
National Laboratory, and her continued work has impacted a wide array of medical technologies, electric vehicles,
and other battery applications.
In this section, we examine the principles of battery power and similar voltage sources, particularly the energy
creation and internal resistance.
Introduction to Electromotive Force
Voltage has many sources, a few of which are shown in Figure 10.2. All such devices create a potential difference
and can supply current if connected to a circuit. A special type of potential difference is known as electromotive
force (emf). The emf is not a force at all, but the term ‘electromotive force’ is used for historical reasons. It was
coined by Alessandro Volta in the 1800s, when he invented the first battery, also known as the voltaic pile. Because
the electromotive force is not a force, it is common to refer to these sources simply as sources of emf (pronounced
as the letters “ee-em-eff”), instead of sources of electromotive force.
10.1 • Electromotive Force 407

![이미지](images/page046_img00.webp)

FIGURE 10.2 A variety of voltage sources. (a) The Brazos Wind Farm in Fluvanna, Texas; (b) the Krasnoyarsk Dam in Russia; (c) a solar farm;
(d) a group of nickel metal hydride batteries. The voltage output of each device depends on its construction and load. The voltage output
equals emf only if there is no load. (credit a: modification of work by Stig Nygaard; credit b: modification of work by "vadimpl"/Wikimedia
Commons; credit c: modification of work by "The tdog"/Wikimedia Commons; credit d: modification of work by "Itrados"/Wikimedia
Commons)
If the electromotive force is not a force at all, then what is the emf and what is a source of emf? To answer these
questions, consider a simple circuit of a 12-V lamp attached to a 12-V battery, as shown in Figure 10.3. The battery
can be modeled as a two-terminal device that keeps one terminal at a higher electric potential than the second
terminal. The higher electric potential is sometimes called the positive terminal and is labeled with a plus sign. The
lower-potential terminal is sometimes called the negative terminal and labeled with a minus sign. This is the source
of the emf.

![이미지](images/page046_img01.webp)

FIGURE 10.3 A source of emf maintains one terminal at a higher electric potential than the other terminal, acting as a source of current in a
circuit.
When the emf source is not connected to the lamp, there is no net flow of charge within the emf source. Once the
battery is connected to the lamp, charges flow from one terminal of the battery, through the lamp (causing the lamp
408 10 • Direct-Current Circuits
to light), and back to the other terminal of the battery. If we consider positive (conventional) current flow, positive
charges leave the positive terminal, travel through the lamp, and enter the negative terminal.
Positive current flow is useful for most of the circuit analysis in this chapter, but in metallic wires and resistors,
electrons contribute the most to current, flowing in the opposite direction of positive current flow. Therefore, it is
more realistic to consider the movement of electrons for the analysis of the circuit in Figure 10.3. The electrons
leave the negative terminal, travel through the lamp, and return to the positive terminal. In order for the emf source
to maintain the potential difference between the two terminals, negative charges (electrons) must be moved from
the positive terminal to the negative terminal. The emf source acts as a charge pump, moving negative charges from
the positive terminal to the negative terminal to maintain the potential difference. This increases the potential
energy of the charges and, therefore, the electric potential of the charges.
The force on the negative charge from the electric field is in the opposite direction of the electric field, as shown in
Figure 10.3. In order for the negative charges to be moved to the negative terminal, work must be done on the
negative charges. This requires energy, which comes from chemical reactions in the battery. The potential is kept
high on the positive terminal and low on the negative terminal to maintain the potential difference between the two
terminals. The emf is equal to the work done on the charge per unit charge when there is no current
flowing. Since the unit for work is the joule and the unit for charge is the coulomb, the unit for emf is the volt
The terminal voltage of a battery is voltage measured across the terminals of the battery. An ideal battery
is an emf source that maintains a constant terminal voltage, independent of the current between the two terminals.
An ideal battery has no internal resistance, and the terminal voltage is equal to the emf of the battery. In the next
section, we will show that a real battery does have internal resistance and the terminal voltage is always less than
the emf of the battery.
The Origin of Battery Potential
The combination of chemicals and the makeup of the terminals in a battery determine its emf. The lead acid battery
used in cars and other vehicles is one of the most common combinations of chemicals. Figure 10.4 shows a single
cell (one of six) of this battery. The cathode (positive) terminal of the cell is connected to a lead oxide plate, whereas
the anode (negative) terminal is connected to a lead plate. Both plates are immersed in sulfuric acid, the electrolyte
for the system.

![이미지](images/page047_img00.webp)

FIGURE 10.4 Chemical reactions in a lead-acid cell separate charge, sending negative charge to the anode, which is connected to the lead
plates. The lead oxide plates are connected to the positive or cathode terminal of the cell. Sulfuric acid conducts the charge, as well as
participates in the chemical reaction.
Knowing a little about how the chemicals in a lead-acid battery interact helps in understanding the potential created
by the battery. Figure 10.5 shows the result of a single chemical reaction. Two electrons are placed on the anode,
making it negative, provided that the cathode supplies two electrons. This leaves the cathode positively charged,
10.1 • Electromotive Force 409
because it has lost two electrons. In short, a separation of charge has been driven by a chemical reaction.
Note that the reaction does not take place unless there is a complete circuit to allow two electrons to be supplied to
the cathode. Under many circumstances, these electrons come from the anode, flow through a resistance, and
return to the cathode. Note also that since the chemical reactions involve substances with resistance, it is not
possible to create the emf without an internal resistance.

![이미지](images/page048_img00.webp)

FIGURE 10.5 In a lead-acid battery, two electrons are forced onto the anode of a cell, and two electrons are removed from the cathode of
the cell. The chemical reaction in a lead-acid battery places two electrons on the anode and removes two from the cathode. It requires a
closed circuit to proceed, since the two electrons must be supplied to the cathode.
You are likely familiar with many other types of batteries, such as the lithium-ion batteries found in many devices.
These function in the same general way as lead-acid batteries, but utilize different chemicals. The specific
compounds vary significantly, and researchers and companies continually innovate based on the requirements of
each device. In many cases, the anode is composed of graphite, silicon-based materials, or metallic lithium. The
cathode is often composed of lithium oxide compound, which may also contain manganese, cobalt, or other
materials. And the electrolyte is usually a type of lithium salt.
Internal Resistance and Terminal Voltage
The amount of resistance to the flow of current within the voltage source is called the internal resistance. The
internal resistance r of a battery can behave in complex ways. It generally increases as a battery is depleted, due to
the oxidation of the plates or the reduction of the acidity of the electrolyte. However, internal resistance may also
depend on the magnitude and direction of the current through a voltage source, its temperature, and even its
history. The internal resistance of rechargeable nickel-cadmium cells, for example, depends on how many times and
how deeply they have been depleted. A simple model for a battery consists of an idealized emf source and an
internal resistance r (Figure 10.6).
410 10 • Direct-Current Circuits

![이미지](images/page049_img00.webp)

FIGURE 10.6 A battery can be modeled as an idealized emf with an internal resistance (r). The terminal voltage of the battery is
.
Suppose an external resistor, known as the load resistance R, is connected to a voltage source such as a battery, as
in Figure 10.7. The figure shows a model of a battery with an emf , an internal resistance r, and a load resistor R
connected across its terminals. Using conventional current flow, positive charges leave the positive terminal of the
battery, travel through the resistor, and return to the negative terminal of the battery. The terminal voltage of the
battery depends on the emf, the internal resistance, and the current, and is equal to
10.1
For a given emf and internal resistance, the terminal voltage decreases as the current increases due to the potential
drop Ir of the internal resistance.

![이미지](images/page049_img01.webp)

FIGURE 10.7 Schematic of a voltage source and its load resistor R. Since the internal resistance r is in series with the load, it can
significantly affect the terminal voltage and the current delivered to the load.
A graph of the potential difference across each element of the circuit is shown in Figure 10.8. A current I runs
through the circuit, and the potential drop across the internal resistor is equal to Ir. The terminal voltage is equal to
, which is equal to the potential drop across the load resistor . As with potential energy, it is the
change in voltage that is important. When the term “voltage” is used, we assume that it is actually the change in the
potential, or . However, is often omitted for convenience.
10.1 • Electromotive Force 411

![이미지](images/page050_img00.webp)

FIGURE 10.8 A graph of the voltage through the circuit of a battery and a load resistance. The electric potential increases the emf of the
battery due to the chemical reactions doing work on the charges. There is a decrease in the electric potential in the battery due to the
internal resistance. The potential decreases due to the internal resistance , making the terminal voltage of the battery equal to
. The voltage then decreases by (IR). The current is equal to
The current through the load resistor is . We see from this expression that the smaller the internal
resistance r, the greater the current the voltage source supplies to its load R. As batteries are depleted, r increases.
If r becomes a significant fraction of the load resistance, then the current is significantly reduced, as the following
example illustrates.
EXAMPLE 10.1
Analyzing a Circuit with a Battery and a Load
A given battery has a 12.00-V emf and an internal resistance of . (a) Calculate its terminal voltage when
connected to a load. (b) What is the terminal voltage when connected to a load? (c) What power
does the load dissipate? (d) If the internal resistance grows to , find the current, terminal voltage,
and power dissipated by a load.
Strategy
The analysis above gave an expression for current when internal resistance is taken into account. Once the current is
found, the terminal voltage can be calculated by using the equation . Once current is found, we
can also find the power dissipated by the resistor.
Solution
a. Entering the given values for the emf, load resistance, and internal resistance into the expression above yields
Enter the known values into the equation to get the terminal voltage:
The terminal voltage here is only slightly lower than the emf, implying that the current drawn by this light load
is not significant.
b. Similarly, with , the current is
The terminal voltage is now
The terminal voltage exhibits a more significant reduction compared with emf, implying is a heavy
load for this battery. A “heavy load” signifies a larger draw of current from the source but not a larger
resistance.
412 10 • Direct-Current Circuits
c. The power dissipated by the load can be found using the formula . Entering the known
values gives
Note that this power can also be obtained using the expression , where V is the terminal voltage
(10.0 V in this case).
d. Here, the internal resistance has increased, perhaps due to the depletion of the battery, to the point where it is
as great as the load resistance. As before, we first find the current by entering the known values into the
expression, yielding
Now the terminal voltage is
and the power dissipated by the load is
We see that the increased internal resistance has significantly decreased the terminal voltage, current, and
power delivered to a load.
Significance
The internal resistance of a battery can increase for many reasons. For example, the internal resistance of a
rechargeable battery increases as the number of times the battery is recharged increases. The increased internal
resistance may have two effects on the battery. First, the terminal voltage will decrease. Second, the battery may
overheat due to the increased power dissipated by the internal resistance.
CHECK YOUR UNDERSTANDING 10.1
If you place a wire directly across the two terminal of a battery, effectively shorting out the terminals, the battery
will begin to get hot. Why do you suppose this happens?
Battery Testers
Battery testers, such as those in Figure 10.9, use small load resistors to intentionally draw current to determine
whether the terminal potential drops below an acceptable level. A weak battery has a high internal resistance,
resulting in a low terminal voltage.

![이미지](images/page051_img00.webp)

FIGURE 10.9 Battery testers measure terminal voltage under a load to determine the condition of a battery. (a) A US Navy electronics
technician uses a battery tester to test large batteries aboard the aircraft carrier USS Nimitz. The battery tester she uses has a small
resistance that can dissipate large amounts of power. (b) The small device shown is used on small batteries and has a digital display to
indicate the acceptability of the terminal voltage. (credit a: modification of work by Jason A. Johnston; credit b: modification of work by
10.2 • Resistors in Series and Parallel 413
Keith Williamson)
Some batteries can be recharged by passing a current through them in the direction opposite to the current they
supply to an appliance. This is done routinely in cars and in batteries for small electrical appliances and electronic
devices (Figure 10.10). The voltage output of the battery charger must be greater than the emf of the battery to
reverse the current through it. This causes the terminal voltage of the battery to be greater than the emf, since
and I is now negative.

![이미지](images/page052_img00.webp)

FIGURE 10.10 A car battery charger reverses the normal direction of current through a battery, reversing its chemical reaction and
replenishing its chemical potential.
It is important to understand the consequences of the internal resistance of emf sources, such as batteries and
solar cells, but often, the analysis of circuits is done with the terminal voltage of the battery, as we have done in the
previous sections. The terminal voltage is referred to simply as V, dropping the subscript “terminal.” This is because
the internal resistance of the battery is difficult to measure directly and can change over time.
10.2 Resistors in Series and Parallel
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Define the term equivalent resistance
• Calculate the equivalent resistance of resistors connected in series
• Calculate the equivalent resistance of resistors connected in parallel
In Current and Resistance, we described the term ‘resistance’ and explained the basic design of a resistor. Basically,
a resistor limits the flow of charge in a circuit and is an ohmic device where Most circuits have more than
one resistor. If several resistors are connected together and connected to a battery, the current supplied by the
battery depends on the equivalent resistance of the circuit.
The equivalent resistance of a combination of resistors depends on both their individual values and how they are
connected. The simplest combinations of resistors are series and parallel connections (Figure 10.11). In a series
circuit, the output current of the first resistor flows into the input of the second resistor; therefore, the current is the
same in each resistor. In a parallel circuit, all of the resistor leads on one side of the resistors are connected
together and all the leads on the other side are connected together. In the case of a parallel configuration, each
resistor has the same potential drop across it, and the currents through each resistor may be different, depending
on the resistor. The sum of the individual currents equals the current that flows into the parallel connections.

![이미지](images/page052_img01.webp)

FIGURE 10.11 (a) For a series connection of resistors, the current is the same in each resistor. (b) For a parallel connection of resistors, the
414 10 • Direct-Current Circuits
voltage is the same across each resistor.
Resistors in Series
Resistors are said to be in series whenever the current flows through the resistors sequentially. Consider Figure
10.12, which shows three resistors in series with an applied voltage equal to Since there is only one path for
the charges to flow through, the current is the same through each resistor. The equivalent resistance of a set of
resistors in a series connection is equal to the algebraic sum of the individual resistances.

![이미지](images/page053_img00.webp)

FIGURE 10.12 (a) Three resistors connected in series to a voltage source. (b) The original circuit is reduced to an equivalent resistance and
a voltage source.
In Figure 10.12, the current coming from the voltage source flows through each resistor, so the current through each
resistor is the same. The current through the circuit depends on the voltage supplied by the voltage source and the
resistance of the resistors. For each resistor, a potential drop occurs that is equal to the loss of electric potential
energy as a current travels through each resistor. According to Ohm’s law, the potential drop V across a resistor
when a current flows through it is calculated using the equation where I is the current in amps (A) and R is
the resistance in ohms Since energy is conserved, and the voltage is equal to the potential energy per charge,
the sum of the voltage applied to the circuit by the source and the potential drops across the individual resistors
around a loop should be equal to zero:
This equation is often referred to as Kirchhoff’s loop law, which we will look at in more detail later in this chapter. For
Figure 10.12, the sum of the potential drop of each resistor and the voltage supplied by the voltage source should
equal zero:
Since the current through each component is the same, the equality can be simplified to an equivalent resistance,
which is just the sum of the resistances of the individual resistors.
Any number of resistors can be connected in series. If N resistors are connected in series, the equivalent resistance
is
10.2 • Resistors in Series and Parallel 415
10.2
One result of components connected in a series circuit is that if something happens to one component, it affects all
the other components. For example, if several lamps are connected in series and one bulb burns out, all the other
lamps go dark.
EXAMPLE 10.2
Equivalent Resistance, Current, and Power in a Series Circuit
A battery with a terminal voltage of 9 V is connected to a circuit consisting of four and one resistors all in
series (Figure 10.13). Assume the battery has negligible internal resistance. (a) Calculate the equivalent resistance
of the circuit. (b) Calculate the current through each resistor. (c) Calculate the potential drop across each resistor. (d)
Determine the total power dissipated by the resistors and the power supplied by the battery.

![이미지](images/page054_img00.webp)

FIGURE 10.13 A simple series circuit with five resistors.
Strategy
In a series circuit, the equivalent resistance is the algebraic sum of the resistances. The current through the circuit
can be found from Ohm’s law and is equal to the voltage divided by the equivalent resistance. The potential drop
across each resistor can be found using Ohm’s law. The power dissipated by each resistor can be found using
, and the total power dissipated by the resistors is equal to the sum of the power dissipated by each
resistor. The power supplied by the battery can be found using .
Solution
a. The equivalent resistance is the algebraic sum of the resistances:
b. The current through the circuit is the same for each resistor in a series circuit and is equal to the applied
voltage divided by the equivalent resistance:
c. The potential drop across each resistor can be found using Ohm’s law:
Note that the sum of the potential drops across each resistor is equal to the voltage supplied by the battery.
d. The power dissipated by a resistor is equal to , and the power supplied by the battery is equal to
:
416 10 • Direct-Current Circuits
Significance
There are several reasons why we would use multiple resistors instead of just one resistor with a resistance equal to
the equivalent resistance of the circuit. Perhaps a resistor of the required size is not available, or we need to
dissipate the heat generated, or we want to minimize the cost of resistors. Each resistor may cost a few cents to a
few dollars, but when multiplied by thousands of units, the cost saving may be appreciable.
CHECK YOUR UNDERSTANDING 10.2
Some strings of miniature holiday lights are made to short out when a bulb burns out. The device that causes the
short is called a shunt, which allows current to flow around the open circuit. A “short” is like putting a piece of wire
across the component. The bulbs are usually grouped in series of nine bulbs. If too many bulbs burn out, the shunts
eventually open. What causes this?
Let’s briefly summarize the major features of resistors in series:
1. Series resistances add together to get the equivalent resistance:
2. The same current flows through each resistor in series.
3. Individual resistors in series do not get the total source voltage, but divide it. The total potential drop across a
series configuration of resistors is equal to the sum of the potential drops across each resistor.
Resistors in Parallel
Figure 10.14 shows resistors in parallel, wired to a voltage source. Resistors are in parallel when one end of all the
resistors are connected by a continuous wire of negligible resistance and the other end of all the resistors are also
connected to one another through a continuous wire of negligible resistance. The potential drop across each resistor
is the same. Current through each resistor can be found using Ohm’s law where the voltage is constant
across each resistor. For example, an automobile’s headlights, radio, and other systems are wired in parallel, so that
each subsystem utilizes the full voltage of the source and can operate completely independently. The same is true of
the wiring in your house or any building.

![이미지](images/page055_img00.webp)

FIGURE 10.14 (a) Two resistors connected in parallel to a voltage source. (b) The original circuit is reduced to an equivalent resistance and
a voltage source.
The current flowing from the voltage source in Figure 10.14 depends on the voltage supplied by the voltage source
and the equivalent resistance of the circuit. In this case, the current flows from the voltage source and enters a
junction, or node, where the circuit splits flowing through resistors and . As the charges flow from the battery,
some go through resistor and some flow through resistor The sum of the currents flowing into a junction
10.2 • Resistors in Series and Parallel 417
must be equal to the sum of the currents flowing out of the junction:
This equation is referred to as Kirchhoff’s junction rule and will be discussed in detail in the next section. In Figure
10.14, the junction rule gives . There are two loops in this circuit, which leads to the equations
and . Note the voltage across the resistors in parallel are the same and
the current is additive:
Generalizing to any number of N resistors, the equivalent resistance of a parallel connection is related to the
individual resistances by
10.3
This relationship results in an equivalent resistance that is less than the smallest of the individual resistances.
When resistors are connected in parallel, more current flows from the source than would flow for any of them
individually, so the total resistance is lower.
EXAMPLE 10.3
Analysis of a Parallel Circuit
Three resistors and are connected in parallel. The parallel connection is
attached to a voltage source. (a) What is the equivalent resistance? (b) Find the current supplied by the
source to the parallel circuit. (c) Calculate the currents in each resistor and show that these add together to equal
the current output of the source. (d) Calculate the power dissipated by each resistor. (e) Find the power output of
the source and show that it equals the total power dissipated by the resistors.
Strategy
(a) The total resistance for a parallel combination of resistors is found using .
(Note that in these calculations, each intermediate answer is shown with an extra digit.)
(b) The current supplied by the source can be found from Ohm’s law, substituting for the total resistance
(c) The individual currents are easily calculated from Ohm’s law , since each resistor gets the full voltage.
The total current is the sum of the individual currents:
(d) The power dissipated by each resistor can be found using any of the equations relating power to current, voltage,
and resistance, since all three are known. Let us use since each resistor gets full voltage.
(e) The total power can also be calculated in several ways, use .
418 10 • Direct-Current Circuits
Solution
a. The total resistance for a parallel combination of resistors is found using Equation 10.3. Entering known
values gives
The total resistance with the correct number of significant digits is As predicted, is less than
the smallest individual resistance.
b. The total current can be found from Ohm’s law, substituting for the total resistance. This gives
Current I for each device is much larger than for the same devices connected in series (see the previous
example). A circuit with parallel connections has a smaller total resistance than the resistors connected in
series.
c. The individual currents are easily calculated from Ohm’s law, since each resistor gets the full voltage. Thus,
Similarly,
and
The total current is the sum of the individual currents:
d. The power dissipated by each resistor can be found using any of the equations relating power to current,
voltage, and resistance, since all three are known. Let us use since each resistor gets full voltage.
Thus,
Similarly,
and
e. The total power can also be calculated in several ways. Choosing and entering the total current yields
Significance
Total power dissipated by the resistors is also 18.00 W:
Notice that the total power dissipated by the resistors equals the power supplied by the source.
10.2 • Resistors in Series and Parallel 419
CHECK YOUR UNDERSTANDING 10.3
Consider the same potential difference applied to the same three resistors connected in series. Would
the equivalent resistance of the series circuit be higher, lower, or equal to the three resistor in parallel? Would the
current through the series circuit be higher, lower, or equal to the current provided by the same voltage applied to
the parallel circuit? How would the power dissipated by the resistor in series compare to the power dissipated by
the resistors in parallel?
CHECK YOUR UNDERSTANDING 10.4
How would you use a river and two waterfalls to model a parallel configuration of two resistors? How does this
analogy break down?
Let us summarize the major features of resistors in parallel:
1. Equivalent resistance is found from
and is smaller than any individual resistance in the combination.
2. The potential drop across each resistor in parallel is the same.
3. Parallel resistors do not each get the total current; they divide it. The current entering a parallel combination
of resistors is equal to the sum of the current through each resistor in parallel.
In this chapter, we introduced the equivalent resistance of resistors connect in series and resistors connected in
parallel. You may recall that in Capacitance, we introduced the equivalent capacitance of capacitors connected in
series and parallel. Circuits often contain both capacitors and resistors. Table 10.1 summarizes the equations used
for the equivalent resistance and equivalent capacitance for series and parallel connections.
Series combination Parallel combination
Equivalent capacitance
Equivalent resistance
TABLE 10.1 Summary for Equivalent Resistance and Capacitance in Series and Parallel Combinations
Combinations of Series and Parallel
More complex connections of resistors are often just combinations of series and parallel connections. Such
combinations are common, especially when wire resistance is considered. In that case, wire resistance is in series
with other resistances that are in parallel.
Combinations of series and parallel can be reduced to a single equivalent resistance using the technique illustrated
in Figure 10.15. Various parts can be identified as either series or parallel connections, reduced to their equivalent
resistances, and then further reduced until a single equivalent resistance is left. The process is more time
consuming than difficult. Here, we note the equivalent resistance as
420 10 • Direct-Current Circuits

![이미지](images/page059_img00.webp)

FIGURE 10.15 (a) The original circuit of four resistors. (b) Step 1: The resistors and are in series and the equivalent resistance is
(c) Step 2: The reduced circuit shows resistors and are in parallel, with an equivalent resistance of (d)
Step 3: The reduced circuit shows that and are in series with an equivalent resistance of which is the equivalent
resistance (e) The reduced circuit with a voltage source of with an equivalent resistance of This results in a
current of from the voltage source.
Notice that resistors and are in series. They can be combined into a single equivalent resistance. One
method of keeping track of the process is to include the resistors as subscripts. Here the equivalent resistance of
and is
The circuit now reduces to three resistors, shown in Figure 10.15(c). Redrawing, we now see that resistors and
constitute a parallel circuit. Those two resistors can be reduced to an equivalent resistance:
This step of the process reduces the circuit to two resistors, shown in in Figure 10.15(d). Here, the circuit reduces to
two resistors, which in this case are in series. These two resistors can be reduced to an equivalent resistance, which
is the equivalent resistance of the circuit:
The main goal of this circuit analysis is reached, and the circuit is now reduced to a single resistor and single voltage
source.
10.2 • Resistors in Series and Parallel 421
Now we can analyze the circuit. The current provided by the voltage source is This current
runs through resistor and is designated as The potential drop across can be found using Ohm’s law:
Looking at Figure 10.15(c), this leaves to be dropped across the parallel combination of
and The current through can be found using Ohm’s law:
The resistors and are in series so the currents and are equal to
Using Ohm’s law, we can find the potential drop across the last two resistors. The potential drops are
and The final analysis is to look at the power supplied by the voltage source
and the power dissipated by the resistors. The power dissipated by the resistors is
The total energy is constant in any process. Therefore, the power supplied by the voltage source is
Analyzing the power supplied to the circuit and the power dissipated by the
resistors is a good check for the validity of the analysis; they should be equal.
EXAMPLE 10.4
Combining Series and Parallel Circuits
Figure 10.16 shows resistors wired in a combination of series and parallel. We can consider to be the resistance
of wires leading to and (a) Find the equivalent resistance of the circuit. (b) What is the potential drop
across resistor ? (c) Find the current through resistor . (d) What power is dissipated by ?

![이미지](images/page060_img00.webp)

FIGURE 10.16 These three resistors are connected to a voltage source so that and are in parallel with one another and that
combination is in series with
Strategy
(a) To find the equivalent resistance, first find the equivalent resistance of the parallel connection of and
Then use this result to find the equivalent resistance of the series connection with
422 10 • Direct-Current Circuits
(b) The current through can be found using Ohm’s law and the voltage applied. The current through is equal
to the current from the battery. The potential drop across the resistor (which represents the resistance in the
connecting wires) can be found using Ohm’s law.
(c) The current through can be found using Ohm’s law The voltage across can be found using
(d) Using Ohm’s law , the power dissipated by the resistor can also be found using .
Solution
a. To find the equivalent resistance of the circuit, notice that the parallel connection of and is in series
with , so the equivalent resistance is
The total resistance of this combination is intermediate between the pure series and pure parallel values (
and , respectively).
b. The current through is equal to the current supplied by the battery:
The voltage across is
The voltage applied to and is less than the voltage supplied by the battery by an amount When wire
resistance is large, it can significantly affect the operation of the devices represented by and .
c. To find the current through , we must first find the voltage applied to it. The voltage across the two resistors
in parallel is the same:
Now we can find the current through resistance using Ohm’s law:
The current is less than the 2.00 A that flowed through when it was connected in parallel to the battery in
the previous parallel circuit example.
d. The power dissipated by is given by
Significance
The analysis of complex circuits can often be simplified by reducing the circuit to a voltage source and an equivalent
resistance. Even if the entire circuit cannot be reduced to a single voltage source and a single equivalent resistance,
portions of the circuit may be reduced, greatly simplifying the analysis.
CHECK YOUR UNDERSTANDING 10.5
Consider the electrical circuits in your home. Give at least two examples of circuits that must use a combination of
series and parallel circuits to operate efficiently.
Practical Implications
One implication of this last example is that resistance in wires reduces the current and power delivered to a resistor.
If wire resistance is relatively large, as in a worn (or a very long) extension cord, then this loss can be significant. If a
large current is drawn, the IR drop in the wires can also be significant and may become apparent from the heat
10.2 • Resistors in Series and Parallel 423
generated in the cord.
For example, when you are rummaging in the refrigerator and the motor comes on, the refrigerator light dims
momentarily. Similarly, you can see the passenger compartment light dim when you start the engine of your car
(although this may be due to resistance inside the battery itself).
What is happening in these high-current situations is illustrated in Figure 10.17. The device represented by has a
very low resistance, so when it is switched on, a large current flows. This increased current causes a larger IR drop
in the wires represented by , reducing the voltage across the light bulb (which is ), which then dims noticeably.

![이미지](images/page062_img00.webp)

FIGURE 10.17 Why do lights dim when a large appliance is switched on? The answer is that the large current the appliance motor draws
causes a significant IR drop in the wires and reduces the voltage across the light.
PROBLEM-SOLVING STRATEGY
Series and Parallel Resistors
1. Draw a clear circuit diagram, labeling all resistors and voltage sources. This step includes a list of the known
values for the problem, since they are labeled in your circuit diagram.
2. Identify exactly what needs to be determined in the problem (identify the unknowns). A written list is useful.
3. Determine whether resistors are in series, parallel, or a combination of both series and parallel. Examine the
circuit diagram to make this assessment. Resistors are in series if the same current must pass sequentially
through them.
4. Use the appropriate list of major features for series or parallel connections to solve for the unknowns. There is
one list for series and another for parallel.
5. Check to see whether the answers are reasonable and consistent.
EXAMPLE 10.5
Combining Series and Parallel Circuits
Two resistors connected in series are connected to two resistors that are connected in parallel .
424 10 • Direct-Current Circuits
The series-parallel combination is connected to a battery. Each resistor has a resistance of 10.00 Ohms. The wires
connecting the resistors and battery have negligible resistance. A current of 2.00 Amps runs through resistor
What is the voltage supplied by the voltage source?
Strategy
Use the steps in the preceding problem-solving strategy to find the solution for this example.
Solution
1. Draw a clear circuit diagram (Figure 10.18).

![이미지](images/page063_img00.webp)

FIGURE 10.18 To find the unknown voltage, we must first find the equivalent resistance of the circuit.
2. The unknown is the voltage of the battery. In order to find the voltage supplied by the battery, the equivalent
resistance must be found.
3. In this circuit, we already know that the resistors and are in series and the resistors and are in
parallel. The equivalent resistance of the parallel configuration of the resistors and is in series with the
series configuration of resistors and .
4. The voltage supplied by the battery can be found by multiplying the current from the battery and the
equivalent resistance of the circuit. The current from the battery is equal to the current through and is
equal to 2.00 A. We need to find the equivalent resistance by reducing the circuit. To reduce the circuit, first
consider the two resistors in parallel. The equivalent resistance is
This parallel combination is in series with the other two resistors, so the equivalent resistance of the circuit is
The voltage supplied by the battery is therefore
5. One way to check the consistency of your results is to calculate the power supplied by the battery and the
power dissipated by the resistors. The power supplied by the battery is
Since they are in series, the current through equals the current through Since , the current
through each will be 1.00 Amps. The power dissipated by the resistors is equal to the sum of the power
dissipated by each resistor:
Since the power dissipated by the resistors equals the power supplied by the battery, our solution seems
consistent.
Significance
If a problem has a combination of series and parallel, as in this example, it can be reduced in steps by using the
preceding problem-solving strategy and by considering individual groups of series or parallel connections. When
finding for a parallel connection, the reciprocal must be taken with care. In addition, units and numerical results
must be reasonable. Equivalent series resistance should be greater, whereas equivalent parallel resistance should
be smaller, for example. Power should be greater for the same devices in parallel compared with series, and so on.
10.3 • Kirchhoff's Rules 425
10.3 Kirchhoff's Rules
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• State Kirchhoff’s junction rule
• State Kirchhoff’s loop rule
• Analyze complex circuits using Kirchhoff’s rules
We have just seen that some circuits may be analyzed by reducing a circuit to a single voltage source and an
equivalent resistance. Many complex circuits cannot be analyzed with the series-parallel techniques developed in
the preceding sections. In this section, we elaborate on the use of Kirchhoff’s rules to analyze more complex
circuits. For example, the circuit in Figure 10.19 is known as a multi-loop circuit, which consists of junctions. A
junction, also known as a node, is a connection of three or more wires. In this circuit, the previous methods cannot
be used, because not all the resistors are in clear series or parallel configurations that can be reduced. Give it a try.
The resistors and are in series and can be reduced to an equivalent resistance. The same is true of resistors
and . But what do you do then?
Even though this circuit cannot be analyzed using the methods already learned, two circuit analysis rules can be
used to analyze any circuit, simple or complex. The rules are known as Kirchhoff’s rules, after their inventor Gustav
Kirchhoff (1824–1887).

![이미지](images/page064_img00.webp)

FIGURE 10.19 This circuit cannot be reduced to a combination of series and parallel connections. However, we can use Kirchhoff’s rules to
analyze it.
KIRCHHOFF’S RULES
• Kirchhoff’s first rule—the junction rule. The sum of all currents entering a junction must equal the sum of
all currents leaving the junction:
10.4
• Kirchhoff’s second rule—the loop rule. The algebraic sum of changes in potential around any closed circuit
path (loop) must be zero:
10.5
We now provide explanations of these two rules, followed by problem-solving hints for applying them and a worked
example that uses them.
Kirchhoff’s First Rule
Kirchhoff’s first rule (the junction rule) applies to the charge entering and leaving a junction (Figure 10.20). As
stated earlier, a junction, or node, is a connection of three or more wires. Current is the flow of charge, and charge is
conserved; thus, whatever charge flows into the junction must flow out.
426 10 • Direct-Current Circuits

![이미지](images/page065_img00.webp)

FIGURE 10.20 Charge must be conserved, so the sum of currents into a junction must be equal to the sum of currents out of the junction.
Although it is an over-simplification, an analogy can be made with water pipes connected in a plumbing junction. If
the wires in Figure 10.20 were replaced by water pipes, and the water was assumed to be incompressible, the
volume of water flowing into the junction must equal the volume of water flowing out of the junction.
Kirchhoff’s Second Rule
Kirchhoff’s second rule (the loop rule) applies to potential differences. The loop rule is stated in terms of potential V
rather than potential energy, but the two are related since In a closed loop, whatever energy is supplied by
a voltage source, the energy must be transferred into other forms by the devices in the loop, since there are no other
ways in which energy can be transferred into or out of the circuit. Kirchhoff’s loop rule states that the algebraic sum
of potential differences, including voltage supplied by the voltage sources and resistive elements, in any loop must
be equal to zero. For example, consider a simple loop with no junctions, as in Figure 10.21.

![이미지](images/page065_img01.webp)

FIGURE 10.21 A simple loop with no junctions. Kirchhoff’s loop rule states that the algebraic sum of the voltage differences is equal to zero.
The circuit consists of a voltage source and three external load resistors. The labels a, b, c, and d serve as
references, and have no other significance. The usefulness of these labels will become apparent soon. The loop is
designated as Loop abcda, and the labels help keep track of the voltage differences as we travel around the circuit.
Start at point a and travel to point b. The voltage of the voltage source is added to the equation and the potential
drop of the resistor is subtracted. From point b to c, the potential drop across is subtracted. From c to d, the
potential drop across is subtracted. From points d to a, nothing is done because there are no components.
Figure 10.22 shows a graph of the voltage as we travel around the loop. Voltage increases as we cross the battery,
whereas voltage decreases as we travel across a resistor. The potential drop, or change in the electric potential, is
equal to the current through the resistor times the resistance of the resistor. Since the wires have negligible
resistance, the voltage remains constant as we cross the wires connecting the components.
10.3 • Kirchhoff's Rules 427

![이미지](images/page066_img00.webp)

FIGURE 10.22 A voltage graph as we travel around the circuit. The voltage increases as we cross the battery and decreases as we cross
each resistor. Since the resistance of the wire is quite small, we assume that the voltage remains constant as we cross the wires connecting
the components.
Then Kirchhoff’s loop rule states
The loop equation can be used to find the current through the loop:
This loop could have been analyzed using the previous methods, but we will demonstrate the power of Kirchhoff’s
method in the next section.
Applying Kirchhoff’s Rules
By applying Kirchhoff’s rules, we generate a set of linear equations that allow us to find the unknown values in
circuits. These may be currents, voltages, or resistances. Each time a rule is applied, it produces an equation. If
there are as many independent equations as unknowns, then the problem can be solved.
Using Kirchhoff’s method of analysis requires several steps, as listed in the following procedure.
PROBLEM-SOLVING STRATEGY
Kirchhoff’s Rules
1. Label points in the circuit diagram using lowercase letters a, b, c, …. These labels simply help with orientation.
2. Locate the junctions in the circuit. The junctions are points where three or more wires connect. Label each
junction with the currents and directions into and out of it. Make sure at least one current points into the
junction and at least one current points out of the junction.
3. Choose the loops in the circuit. Every component must be contained in at least one loop, but a component
may be contained in more than one loop.
4. Apply the junction rule. Again, some junctions should not be included in the analysis. You need only use
enough nodes to include every current.
5. Apply the loop rule. Use the map in Figure 10.23.
428 10 • Direct-Current Circuits

![이미지](images/page067_img00.webp)

FIGURE 10.23 Each of these resistors and voltage sources is traversed from a to b. (a) When moving across a resistor in the same direction
as the current flow, subtract the potential drop. (b) When moving across a resistor in the opposite direction as the current flow, add the
potential drop. (c) When moving across a voltage source from the negative terminal to the positive terminal, add the potential drop. (d)
When moving across a voltage source from the positive terminal to the negative terminal, subtract the potential drop.
Let’s examine some steps in this procedure more closely. When locating the junctions in the circuit, do not be
concerned about the direction of the currents. If the direction of current flow is not obvious, choosing any direction
is sufficient as long as at least one current points into the junction and at least one current points out of the junction.
If the arrow is in the opposite direction of the conventional current flow, the result for the current in question will be
negative but the answer will still be correct.
The number of nodes depends on the circuit. Each current should be included in a node and thus included in at least
one junction equation. Do not include nodes that are not linearly independent, meaning nodes that contain the same
information.
Consider Figure 10.24. There are two junctions in this circuit: Junction b and Junction e. Points a, c, d, and f are not
junctions, because a junction must have three or more connections. The equation for Junction b is ,
and the equation for Junction e is . These are equivalent equations, so it is necessary to keep only one
of them.

![이미지](images/page067_img01.webp)

FIGURE 10.24 At first glance, this circuit contains two junctions, Junction b and Junction e, but only one should be considered because
their junction equations are equivalent.
When choosing the loops in the circuit, you need enough loops so that each component is covered once, without
repeating loops. Figure 10.25 shows four choices for loops to solve a sample circuit; choices (a), (b), and (c) have a
sufficient amount of loops to solve the circuit completely. Option (d) reflects more loops than necessary to solve the
circuit.
10.3 • Kirchhoff's Rules 429

![이미지](images/page068_img00.webp)

FIGURE 10.25 Panels (a)–(c) are sufficient for the analysis of the circuit. In each case, the two loops shown contain all the circuit elements
necessary to solve the circuit completely. Panel (d) shows three loops used, which is more than necessary. Any two loops in the system will
contain all information needed to solve the circuit. Adding the third loop provides redundant information.
Consider the circuit in Figure 10.26(a). Let us analyze this circuit to find the current through each resistor. First, label
the circuit as shown in part (b).

![이미지](images/page068_img01.webp)

FIGURE 10.26 (a) A multi-loop circuit. (b) Label the circuit to help with orientation.
Next, determine the junctions. In this circuit, points b and e each have three wires connected, making them
junctions. Start to apply Kirchhoff’s junction rule by drawing arrows representing the currents
and labeling each arrow, as shown in Figure 10.27(b). Junction b shows that and Junction e shows
that . Since Junction e gives the same information of Junction b, it can be disregarded. This circuit has
three unknowns, so we need three linearly independent equations to analyze it.
430 10 • Direct-Current Circuits

![이미지](images/page069_img00.webp)

FIGURE 10.27 (a) This circuit has two junctions, labeled b and e, but only node b is used in the analysis. (b) Labeled arrows represent the
currents into and out of the junctions.
Next we need to choose the loops. In Figure 10.28, Loop abefa includes the voltage source and resistors and
. The loop starts at point a, then travels through points b, e, and f, and then back to point a. The second loop,
Loop ebcde, starts at point e and includes resistors and , and the voltage source .

![이미지](images/page069_img01.webp)

FIGURE 10.28 Choose the loops in the circuit.
Now we can apply Kirchhoff’s loop rule, using the map in Figure 10.23. Starting at point a and moving to point b, the
resistor is crossed in the same direction as the current flow , so the potential drop is subtracted. Moving
from point b to point e, the resistor is crossed in the same direction as the current flow so the potential drop
is subtracted. Moving from point e to point f, the voltage source is crossed from the negative terminal to
the positive terminal, so is added. There are no components between points f and a. The sum of the voltage
differences must equal zero:
Finally, we check loop ebcde. We start at point e and move to point b, crossing in the opposite direction as the
current flow . The potential drop is added. Next, we cross and in the same direction as the current
flow and subtract the potential drops and Note that the current is the same through resistors
and , because they are connected in series. Finally, the voltage source is crossed from the positive terminal to the
negative terminal, and the voltage source is subtracted. The sum of these voltage differences equals zero and
yields the loop equation
We now have three equations, which we can solve for the three unknowns.
10.3 • Kirchhoff's Rules 431
To solve the three equations for the three unknown currents, start by eliminating current . First add Eq. (1) times
to Eq. (2). The result is labeled as Eq. (4):
Next, subtract Eq. (3) from Eq. (2). The result is labeled as Eq. (5):
We can solve Eqs. (4) and (5) for current . Adding seven times Eq. (4) and three times Eq. (5) results in
or Using Eq. (4) results in Finally, Eq. (1) yields
One way to check that the solutions are consistent is to check the power supplied by the
voltage sources and the power dissipated by the resistors:
Note that the solution for the current is negative. This is the correct answer, but suggests that the arrow originally
drawn in the junction analysis is the direction opposite of conventional current flow. The power supplied by the
second voltage source is 58 W and not −58 W.
EXAMPLE 10.6
Calculating Current by Using Kirchhoff’s Rules
Find the currents flowing in the circuit in Figure 10.29.
432 10 • Direct-Current Circuits

![이미지](images/page071_img00.webp)

FIGURE 10.29 This circuit is a combination of series and parallel configurations of resistors and voltage sources. This circuit cannot be
analyzed using the techniques discussed in Electromotive Force but can be analyzed using Kirchhoff’s rules.
Strategy
This circuit is sufficiently complex that the currents cannot be found using Ohm’s law and the series-parallel
techniques—it is necessary to use Kirchhoff’s rules. Currents have been labeled and in the figure, and
assumptions have been made about their directions. Locations on the diagram have been labeled with letters a
through h. In the solution, we apply the junction and loop rules, seeking three independent equations to allow us to
solve for the three unknown currents.
Solution
Applying the junction and loop rules yields the following three equations. We have three unknowns, so three
equations are required.
Simplify the equations by placing the unknowns on one side of the equations.
Simplify the equations. The first loop equation can be simplified by dividing both sides by 3.00. The second loop
equation can be simplified by dividing both sides by 6.00.
The results are
Significance
A method to check the calculations is to compute the power dissipated by the resistors and the power supplied by
the voltage sources:
10.3 • Kirchhoff's Rules 433
The power supplied equals the power dissipated by the resistors.
CHECK YOUR UNDERSTANDING 10.6
In considering the following schematic and the power supplied and consumed by a circuit, will a voltage source
always provide power to the circuit, or can a voltage source consume power?

![이미지](images/page072_img00.webp)

EXAMPLE 10.7
Calculating Current by Using Kirchhoff’s Rules
Find the current flowing in the circuit in Figure 10.30.

![이미지](images/page072_img01.webp)

FIGURE 10.30 This circuit consists of three resistors and two batteries connected in series. Note that the batteries are connected with
opposite polarities.
Strategy
This circuit can be analyzed using Kirchhoff’s rules. There is only one loop and no nodes. Choose the direction of
current flow. For this example, we will use the clockwise direction from point a to point b. Consider Loop abcda and
434 10 • Direct-Current Circuits
use Figure 10.23 to write the loop equation. Note that according to Figure 10.23, battery will be added and
battery will be subtracted.
Solution
Applying the junction rule yields the following three equations. We have one unknown, so one equation is required:
Simplify the equations by placing the unknowns on one side of the equations. Use the values given in the figure.
Significance
The power dissipated or consumed by the circuit equals the power supplied to the circuit, but notice that the current
in the battery is flowing through the battery from the positive terminal to the negative terminal and consumes
power.
The power supplied equals the power dissipated by the resistors and consumed by the battery
CHECK YOUR UNDERSTANDING 10.7
When using Kirchhoff’s laws, you need to decide which loops to use and the direction of current flow through each
loop. In analyzing the circuit in Example 10.7, the direction of current flow was chosen to be clockwise, from point a
to point b. How would the results change if the direction of the current was chosen to be counterclockwise, from
point b to point a?
Multiple Voltage Sources
Many devices require more than one battery. Multiple voltage sources, such as batteries, can be connected in series
configurations, parallel configurations, or a combination of the two.
In series, the positive terminal of one battery is connected to the negative terminal of another battery. Any number
of voltage sources, including batteries, can be connected in series. Two batteries connected in series are shown in
Figure 10.31. Using Kirchhoff’s loop rule for the circuit in part (b) gives the result
10.3 • Kirchhoff's Rules 435

![이미지](images/page074_img00.webp)

FIGURE 10.31 (a) Two batteries connected in series with a load resistor. (b) The circuit diagram of the two batteries and the load resistor,
with each battery modeled as an idealized emf source and an internal resistance.
When voltage sources are in series, their internal resistances can be added together and their emfs can be added
together to get the total values. Series connections of voltage sources are common—for example, in flashlights, toys,
and other appliances. Usually, the cells are in series in order to produce a larger total emf. In Figure 10.31, the
terminal voltage is
Note that the same current I is found in each battery because they are connected in series. The disadvantage of
series connections of cells is that their internal resistances are additive.
Batteries are connected in series to increase the voltage supplied to the circuit. For instance, an LED flashlight may
have two AAA cell batteries, each with a terminal voltage of 1.5 V, to provide 3.0 V to the flashlight.
Any number of batteries can be connected in series. For N batteries in series, the terminal voltage is equal to
10.6
where the equivalent resistance is .
When a load is placed across voltage sources in series, as in Figure 10.32, we can find the current:
As expected, the internal resistances increase the equivalent resistance.
436 10 • Direct-Current Circuits

![이미지](images/page075_img00.webp)

FIGURE 10.32 Two batteries connect in series to an LED bulb, as found in a flashlight.
Voltage sources, such as batteries, can also be connected in parallel. Figure 10.33 shows two batteries with
identical emfs in parallel and connected to a load resistance. When the batteries are connect in parallel, the positive
terminals are connected together and the negative terminals are connected together, and the load resistance is
connected to the positive and negative terminals. Normally, voltage sources in parallel have identical emfs. In this
simple case, since the voltage sources are in parallel, the total emf is the same as the individual emfs of each
battery.

![이미지](images/page075_img01.webp)

FIGURE 10.33 (a) Two batteries connect in parallel to a load resistor. (b) The circuit diagram shows the shows battery as an emf source and
an internal resistor. The two emf sources have identical emfs (each labeled by ) connected in parallel that produce the same emf.
Consider the Kirchhoff analysis of the circuit in Figure 10.33(b). There are two loops and a node at point c and
.
Node b: .
Loop abcfa:
Loop fcdef:
Solving for the current through the load resistor results in , where . The terminal
voltage is equal to the potential drop across the load resistor . The parallel connection reduces the
internal resistance and thus can produce a larger current.
Any number of batteries can be connected in parallel. For N batteries in parallel, the terminal voltage is equal to
10.4 • Electrical Measuring Instruments 437
10.7
where the equivalent resistance is .
As an example, some diesel trucks use two 12-V batteries in parallel; they produce a total emf of 12 V but can
deliver the larger current needed to start a diesel engine.
In summary, the terminal voltage of batteries in series is equal to the sum of the individual emfs minus the sum of
the internal resistances times the current. When batteries are connected in parallel, they usually have equal emfs
and the terminal voltage is equal to the emf minus the equivalent internal resistance times the current, where the
equivalent internal resistance is smaller than the individual internal resistances. Batteries are connected in series to
increase the terminal voltage to the load. Batteries are connected in parallel to increase the current to the load.
Solar Cell Arrays
Another example dealing with multiple voltage sources is that of combinations of solar cells—wired in both series
and parallel combinations to yield a desired voltage and current. Photovoltaic generation, which is the conversion of
sunlight directly into electricity, is based upon the photoelectric effect. The photoelectric effect is beyond the scope
of this chapter and is covered in Photons and Matter Waves (http://openstax.org/books/university-physics-
volume-3/pages/6-introduction), but in general, photons hitting the surface of a solar cell create an electric current
in the cell.
Most solar cells are made from pure silicon. Most single cells have a voltage output of about 0.5 V, while the current
output is a function of the amount of sunlight falling on the cell (the incident solar radiation known as the insolation).
Under bright noon sunlight, a current per unit area of about of cell surface area is produced by typical
single-crystal cells.
Individual solar cells are connected electrically in modules to meet electrical energy needs. They can be wired
together in series or in parallel—connected like the batteries discussed earlier. A solar-cell array or module usually
consists of between 36 and 72 cells, with a power output of 50 W to 140 W.
Solar cells, like batteries, provide a direct current (dc) voltage. Current from a dc voltage source is unidirectional.
Most household appliances need an alternating current (ac) voltage.
10.4 Electrical Measuring Instruments
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Describe how to connect a voltmeter in a circuit to measure voltage
• Describe how to connect an ammeter in a circuit to measure current
• Describe the use of an ohmmeter
Ohm’s law and Kirchhoff’s method are useful to analyze and design electrical circuits, providing you with the
voltages across, the current through, and the resistance of the components that compose the circuit. To measure
these parameters require instruments, and these instruments are described in this section.
DC Voltmeters and Ammeters
Whereas voltmeters measure voltage, ammeters measure current. Some of the meters in automobile dashboards,
digital cameras, cell phones, and tuner-amplifiers are actually voltmeters or ammeters (Figure 10.34). The internal
construction of the simplest of these meters and how they are connected to the system they monitor give further
insight into applications of series and parallel connections.
438 10 • Direct-Current Circuits

![이미지](images/page077_img00.webp)

FIGURE 10.34 The fuel and temperature gauges (far right and far left, respectively) in this 1996 Volkswagen are voltmeters that register
the voltage output of “sender” units. These units are proportional to the amount of gasoline in the tank and to the engine temperature.
(credit: Christian Giersing)
Measuring Current with an Ammeter
To measure the current through a device or component, the ammeter is placed in series with the device or
component. A series connection is used because objects in series have the same current passing through them.
(See Figure 10.35, where the ammeter is represented by the symbol A.)

![이미지](images/page077_img01.webp)

FIGURE 10.35 (a) When an ammeter is used to measure the current through two resistors connected in series to a battery, a single
ammeter is placed in series with the two resistors because the current is the same through the two resistors in series. (b) When two
resistors are connected in parallel with a battery, three meters, or three separate ammeter readings, are necessary to measure the current
from the battery and through each resistor. The ammeter is connected in series with the component in question.
Ammeters need to have a very low resistance, a fraction of a milliohm. If the resistance is not negligible, placing the
ammeter in the circuit would change the equivalent resistance of the circuit and modify the current that is being
measured. Since the current in the circuit travels through the meter, ammeters normally contain a fuse to protect
the meter from damage from currents which are too high.
Measuring Voltage with a Voltmeter
A voltmeter is connected in parallel with whatever device it is measuring. A parallel connection is used because
objects in parallel experience the same potential difference. (See Figure 10.36, where the voltmeter is represented
by the symbol V.)
10.4 • Electrical Measuring Instruments 439

![이미지](images/page078_img00.webp)

FIGURE 10.36 To measure potential differences in this series circuit, the voltmeter (V) is placed in parallel with the voltage source or either
of the resistors. Note that terminal voltage is measured between the positive terminal and the negative terminal of the battery or voltage
source. It is not possible to connect a voltmeter directly across the emf without including the internal resistance r of the battery.
Since voltmeters are connected in parallel, the voltmeter must have a very large resistance. Digital voltmeters
convert the analog voltage into a digital value to display on a digital readout (Figure 10.37). Inexpensive voltmeters
have resistances on the order of whereas high-precision voltmeters have resistances on the order of
. The value of the resistance may vary, depending on which scale is used on the meter.

![이미지](images/page078_img01.webp)

FIGURE 10.37 (a) An analog voltmeter uses a galvanometer to measure the voltage. (b) Digital meters use an analog-to-digital converter to
measure the voltage. (credit: modification of works by Joseph J. Trout)
Analog and Digital Meters
You may encounter two types of meters in the physics lab: analog and digital. The term ‘analog’ refers to signals or
information represented by a continuously variable physical quantity, such as voltage or current. An analog meter
uses a galvanometer, which is essentially a coil of wire with a small resistance, in a magnetic field, with a pointer
attached that points to a scale. Current flows through the coil, causing the coil to rotate. To use the galvanometer as
an ammeter, a small resistance is placed in parallel with the coil. For a voltmeter, a large resistance is placed in
series with the coil. A digital meter uses a component called an analog-to-digital (A to D) converter and expresses
the current or voltage as a series of the digits 0 and 1, which are used to run a digital display. Most analog meters
have been replaced by digital meters.
CHECK YOUR UNDERSTANDING 10.8
Digital meters are able to detect smaller currents than analog meters employing galvanometers. How does this
explain their ability to measure voltage and current more accurately than analog meters?
440 10 • Direct-Current Circuits
INTERACTIVE
In the virtual lab simulation (https://openstax.org/l/21cirreslabsim), you may construct circuits with different
voltage sources, resistors, and devices, then explore and compare currents and voltage with ammeters and
voltmeters.
Ohmmeters
An ohmmeter is an instrument used to measure the resistance of a component or device. The operation of the
ohmmeter is based on Ohm’s law. Traditional ohmmeters contained an internal voltage source (such as a battery)
that would be connected across the component to be tested, producing a current through the component. A
galvanometer was then used to measure the current and the resistance was deduced using Ohm’s law. Modern
digital meters use a constant current source to pass current through the component, and the voltage difference
across the component is measured. In either case, the resistance is measured using Ohm’s law where
the voltage is known and the current is measured, or the current is known and the voltage is measured.
The component of interest should be isolated from the circuit; otherwise, you will be measuring the equivalent
resistance of the circuit. An ohmmeter should never be connected to a “live” circuit, one with a voltage source
connected to it and current running through it. Doing so can damage the meter.
10.5 RC Circuits
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Describe the charging process of a capacitor
• Describe the discharging process of a capacitor
• List some applications of RC circuits
When you use a flash camera, it takes a few seconds to charge the capacitor that powers the flash. The light flash
discharges the capacitor in a tiny fraction of a second. Why does charging take longer than discharging? This
question and several other phenomena that involve charging and discharging capacitors are discussed in this
module.
Circuits with Resistance and Capacitance
An RC circuit is a circuit containing resistance and capacitance. As presented in Capacitance, the capacitor is an
electrical component that stores electric charge, storing energy in an electric field.
Figure 10.38(a) shows a simple RC circuit that employs a dc (direct current) voltage source , a resistor R, a
capacitor C, and a two-position switch. The circuit allows the capacitor to be charged or discharged, depending on
the position of the switch. When the switch is moved to position A, the capacitor charges, resulting in the circuit in
part (b). When the switch is moved to position B, the capacitor discharges through the resistor.

![이미지](images/page079_img00.webp)

FIGURE 10.38 (a) An RC circuit with a two-pole switch that can be used to charge and discharge a capacitor. (b) When the switch is moved
to position A, the circuit reduces to a simple series connection of the voltage source, the resistor, the capacitor, and the switch. (c) When the
switch is moved to position B, the circuit reduces to a simple series connection of the resistor, the capacitor, and the switch. The voltage
source is removed from the circuit.
10.5 • RC Circuits 441
Charging a Capacitor
We can use Kirchhoff’s loop rule to understand the charging of the capacitor. This results in the equation
This equation can be used to model the charge as a function of time as the capacitor charges.
Capacitance is defined as so the voltage across the capacitor is . Using Ohm’s law, the potential
drop across the resistor is , and the current is defined as
This differential equation can be integrated to find an equation for the charge on the capacitor as a function of time.
Let , then The result is
Simplifying results in an equation for the charge on the charging capacitor as a function of time:
10.8
A graph of the charge on the capacitor versus time is shown in Figure 10.39(a). First note that as time approaches
infinity, the exponential goes to zero, so the charge approaches the maximum charge and has units of
coulombs. The units of RC are seconds, units of time. This quantity is known as the time constant:
10.9
At time , the charge is equal to of the maximum charge . Notice
that the time rate change of the charge is the slope at a point of the charge versus time plot. The slope of the graph
is large at time and approaches zero as time increases.
As the charge on the capacitor increases, the current through the resistor decreases, as shown in Figure 10.39(b).
The current through the resistor can be found by taking the time derivative of the charge.
442 10 • Direct-Current Circuits
10.10
At time the current through the resistor is . As time approaches infinity, the current approaches
zero. At time , the current through the resistor is

![이미지](images/page081_img00.webp)

FIGURE 10.39 (a) Charge on the capacitor versus time as the capacitor charges. (b) Current through the resistor versus time. (c) Voltage
difference across the capacitor. (d) Voltage difference across the resistor.
Figure 10.39(c) and Figure 10.39(d) show the voltage differences across the capacitor and the resistor, respectively.
As the charge on the capacitor increases, the current decreases, as does the voltage difference across the
resistor The voltage difference across the capacitor increases
as
Discharging a Capacitor
When the switch in Figure 10.38(a) is moved to position B, the circuit reduces to the circuit in part (c), and the
charged capacitor is allowed to discharge through the resistor. A graph of the charge on the capacitor as a function
of time is shown in Figure 10.40(a). Using Kirchhoff’s loop rule to analyze the circuit as the capacitor discharges
results in the equation , which simplifies to . Using the definition of current
and integrating the loop equation yields an equation for the charge on the capacitor as a function of time:
10.11
10.5 • RC Circuits 443
Here, Q is the initial charge on the capacitor and is the time constant of the circuit. As shown in the graph,
the charge decreases exponentially from the initial charge, approaching zero as time approaches infinity.
The current as a function of time can be found by taking the time derivative of the charge:
10.12
The negative sign shows that the current flows in the opposite direction of the current found when the capacitor is
charging, as shown in Figure 10.38. Figure 10.40 (parts (a) and (b)) shows an example of a plot of charge versus
time and current versus time. A plot of the voltage difference across the capacitor and the voltage difference across
the resistor as a function of time are shown in parts (c) and (d) of the figure. Note that the magnitudes of the charge,
current, and voltage all decrease exponentially, approaching zero as time increases.

![이미지](images/page082_img00.webp)

FIGURE 10.40 (a) Charge on the capacitor versus time as the capacitor discharges. (b) Current through the resistor versus time. (c) Voltage
difference across the capacitor. (d) Voltage difference across the resistor.
Now we can explain why the flash camera mentioned at the beginning of this section takes so much longer to charge
than discharge: The resistance while charging is significantly greater than while discharging. The internal resistance
of the battery accounts for most of the resistance while charging. As the battery ages, the increasing internal
resistance makes the charging process even slower.
EXAMPLE 10.8
The Relaxation Oscillator
One application of an RC circuit is the relaxation oscillator, as shown below. The relaxation oscillator consists of a
voltage source, a resistor, a capacitor, and a neon lamp. The neon lamp acts like an open circuit (infinite resistance)
until the potential difference across the neon lamp reaches a specific voltage. At that voltage, the lamp acts like a
short circuit (zero resistance), and the capacitor discharges through the neon lamp and produces light. In the
relaxation oscillator shown, the voltage source charges the capacitor until the voltage across the capacitor is 80 V.
444 10 • Direct-Current Circuits
When this happens, the neon in the lamp breaks down and allows the capacitor to discharge through the lamp,
producing a bright flash. After the capacitor fully discharges through the neon lamp, it begins to charge again, and
the process repeats. Assuming that the time it takes the capacitor to discharge is negligible, what is the time interval
between flashes?

![이미지](images/page083_img00.webp)

Strategy
The time period can be found from considering the equation where
Solution
The neon lamp flashes when the voltage across the capacitor reaches 80 V. The RC time constant is equal to
We can solve the voltage equation for the time it takes the
capacitor to reach 80 V:
Significance
One application of the relaxation oscillator is for controlling indicator lights that flash at a frequency determined by
the values for R and C. In this example, the neon lamp will flash every 8.13 seconds, a frequency of
The relaxation oscillator has many other practical uses. It is often used in electronic
circuits, where the neon lamp is replaced by a transistor or a device known as a tunnel diode. The description of the
transistor and tunnel diode is beyond the scope of this chapter, but you can think of them as voltage controlled
switches. They are normally open switches, but when the right voltage is applied, the switch closes and conducts.
The “switch” can be used to turn on another circuit, turn on a light, or run a small motor. A relaxation oscillator can
be used to make the turn signals of your car blink or your cell phone to vibrate.
RC circuits have many applications. They can be used effectively as timers for applications such as intermittent
windshield wipers, pace makers, and strobe lights. Some models of intermittent windshield wipers use a variable
resistor to adjust the interval between sweeps of the wiper. Increasing the resistance increases the RC time
constant, which increases the time between the operation of the wipers.
Another application is the pacemaker. The heart rate is normally controlled by electrical signals, which cause the
muscles of the heart to contract and pump blood. When the heart rhythm is abnormal (the heartbeat is too high or
too low), pace makers can be used to correct this abnormality. Pacemakers have sensors that detect body motion
and breathing to increase the heart rate during physical activities, thus meeting the increased need for blood and
oxygen, and an RC timing circuit can be used to control the time between voltage signals to the heart.
Looking ahead to the study of ac circuits (Alternating-Current Circuits), ac voltages vary as sine functions with
10.5 • RC Circuits 445
specific frequencies. Periodic variations in voltage, or electric signals, are often recorded by scientists. These voltage
signals could come from music recorded by a microphone or atmospheric data collected by radar. Occasionally,
these signals can contain unwanted frequencies known as “noise.” RC filters can be used to filter out the unwanted
frequencies.
In the study of electronics, a popular device known as a 555 timer provides timed voltage pulses. The time between
pulses is controlled by an RC circuit. These are just a few of the countless applications of RC circuits.
EXAMPLE 10.9
Intermittent Windshield Wipers
A relaxation oscillator is used to control a pair of windshield wipers. The relaxation oscillator consists of a 10.00-mF
capacitor and a variable resistor known as a rheostat. A knob connected to the variable resistor allows the
resistance to be adjusted from to The output of the capacitor is used to control a voltage-
controlled switch. The switch is normally open, but when the output voltage reaches 10.00 V, the switch closes,
energizing an electric motor and discharging the capacitor. The motor causes the windshield wipers to sweep once
across the windshield and the capacitor begins to charge again. To what resistance should the rheostat be adjusted
for the period of the wiper blades be 10.00 seconds?

![이미지](images/page084_img00.webp)

Strategy
The resistance considers the equation where The capacitance, output voltage,
and voltage of the battery are given. We need to solve this equation for the resistance.
Solution
The output voltage will be 10.00 V and the voltage of the battery is 12.00 V. The capacitance is given as 10.00 mF.
Solving for the resistance yields
Significance
Increasing the resistance increases the time delay between operations of the windshield wipers. When the
resistance is zero, the windshield wipers run continuously. At the maximum resistance, the period of the operation
446 10 • Direct-Current Circuits
of the wipers is:
The RC circuit has thousands of uses and is a very important circuit to study. Not only can it be used to time circuits,
it can also be used to filter out unwanted frequencies in a circuit and used in power supplies, like the one for your
computer, to help turn ac voltage to dc voltage.
10.6 Household Wiring and Electrical Safety
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• List the basic concepts involved in house wiring
• Define the terms thermal hazard and shock hazard
• Describe the effects of electrical shock on human physiology and their relationship to the amount of
current through the body
• Explain the function of fuses and circuit breakers
Electricity presents two known hazards: thermal and shock. A thermal hazard is one in which an excessive electric
current causes undesired thermal effects, such as starting a fire in the wall of a house. A shock hazard occurs when
an electric current passes through a person. Shocks range in severity from painful, but otherwise harmless, to heart-
stopping lethality. In this section, we consider these hazards and the various factors affecting them in a quantitative
manner. We also examine systems and devices for preventing electrical hazards.
Thermal Hazards
Electric power causes undesired heating effects whenever electric energy is converted into thermal energy at a rate
faster than it can be safely dissipated. A classic example of this is the short circuit, a low-resistance path between
terminals of a voltage source. An example of a short circuit is shown in Figure 10.41. A toaster is plugged into a
common household electrical outlet. Insulation on wires leading to an appliance has worn through, allowing the two
wires to come into contact, or “short.” As a result, thermal energy can quickly raise the temperature of surrounding
materials, melting the insulation and perhaps causing a fire.
The circuit diagram shows a symbol that consists of a sine wave enclosed in a circle. This symbol represents an
alternating current (ac) voltage source. In an ac voltage source, the voltage oscillates between a positive and
negative maximum amplitude. Up to now, we have been considering direct current (dc) voltage sources, but many of
the same concepts are applicable to ac circuits.

![이미지](images/page085_img00.webp)

FIGURE 10.41 A short circuit is an undesired low-resistance path across a voltage source. (a) Worn insulation on the wires of a toaster
allow them to come into contact with a low resistance r. Since , thermal power is created so rapidly that the cord melts or burns.
(b) A schematic of the short circuit.
Another serious thermal hazard occurs when wires supplying power to an appliance are overloaded. Electrical wires
and appliances are often rated for the maximum current they can safely handle. The term “overloaded” refers to a
condition where the current exceeds the rated maximum current. As current flows through a wire, the power
10.6 • Household Wiring and Electrical Safety 447
dissipated in the supply wires is where is the resistance of the wires and I is the current flowing
through the wires. If either I or is too large, the wires overheat. Fuses and circuit breakers are used to limit
excessive currents.
Shock Hazards
Electric shock is the physiological reaction or injury caused by an external electric current passing through the body.
The effect of an electric shock can be negative or positive. When a current with a magnitude above 300 mA passes
through the heart, death may occur. Most electrical shock fatalities occur because a current causes ventricular
fibrillation, a massively irregular and often fatal, beating of the heart. On the other hand, a heart attack victim,
whose heart is in fibrillation, can be saved by an electric shock from a defibrillator.
The effects of an undesirable electric shock can vary in severity: a slight sensation at the point of contact, pain, loss
of voluntary muscle control, difficulty breathing, heart fibrillation, and possibly death. The loss of voluntary muscle
control can cause the victim to not be able to let go of the source of the current.
The major factors upon which the severity of the effects of electrical shock depend are
1. The amount of current I
2. The path taken by the current
3. The duration of the shock
4. The frequency f of the current ( for dc)
Our bodies are relatively good electric conductors due to the body’s water content. A dangerous condition occurs
when the body is in contact with a voltage source and “ground.” The term “ground” refers to a large sink or source of
electrons, for example, the earth (thus, the name). When there is a direct path to ground, large currents will pass
through the parts of the body with the lowest resistance and a direct path to ground. A safety precaution used by
many professions is the wearing of insulated shoes. Insulated shoes prohibit a pathway to ground for electrons
through the feet by providing a large resistance. Whenever working with high-power tools, or any electric circuit,
ensure that you do not provide a pathway for current flow (especially across the heart). A common safety precaution
is to work with one hand, reducing the possibility of providing a current path through the heart.
Very small currents pass harmlessly and unfelt through the body. This happens to you regularly without your
knowledge. The threshold of sensation is only 1 mA and, although unpleasant, shocks are apparently harmless for
currents less than 5 mA. A great number of safety rules take the 5-mA value for the maximum allowed shock. At
5–30 mA and above, the current can stimulate sustained muscular contractions, much as regular nerve impulses do
(Figure 10.42). Very large currents (above 300 mA) cause the heart and diaphragm of the lung to contract for the
duration of the shock. Both the heart and respiration stop. Both often return to normal following the shock.

![이미지](images/page086_img00.webp)

FIGURE 10.42 An electric current can cause muscular contractions with varying effects. (a) The victim is “thrown” backward by involuntary
muscle contractions that extend the legs and torso. (b) The victim can’t let go of the wire that is stimulating all the muscles in the hand.
Those that close the fingers are stronger than those that open them.
Current is the major factor determining shock severity. A larger voltage is more hazardous, but since the
448 10 • Direct-Current Circuits
severity of the shock depends on the combination of voltage and resistance. For example, a person with dry skin has
a resistance of about . If he comes into contact with 120-V ac, a current
passes harmlessly through him. The same person soaking wet may have a resistance of and the same 120
V will produce a current of 12 mA—above the “can’t let go” threshold and potentially dangerous.
Electrical Safety: Systems and Devices
Figure 10.43(a) shows the schematic for a simple ac circuit with no safety features. This is not how power is
distributed in practice. Modern household and industrial wiring requires the three-wire system, shown
schematically in part (b), which has several safety features, with live, neutral, and ground wires. First is the familiar
circuit breaker (or fuse) to prevent thermal overload. Second is a protective case around the appliance, such as a
toaster or refrigerator. The case’s safety feature is that it prevents a person from touching exposed wires and coming
into electrical contact with the circuit, helping prevent shocks.

![이미지](images/page087_img00.webp)

FIGURE 10.43 (a) Schematic of a simple ac circuit with a voltage source and a single appliance represented by the resistance R. There are
no safety features in this circuit. (b) The three-wire system connects the neutral wire to ground at the voltage source and user location,
forcing it to be at zero volts and supplying an alternative return path for the current through ground. Also grounded to zero volts is the case
of the appliance. A circuit breaker or fuse protects against thermal overload and is in series on the active (live/hot) wire.
There are three connections to ground shown in Figure 10.43(b). Recall that a ground connection is a low-resistance
path directly to ground. The two ground connections on the neutral wire force it to be at zero volts relative to ground,
giving the wire its name. This wire is therefore safe to touch even if its insulation, usually white, is missing. The
neutral wire is the return path for the current to follow to complete the circuit. Furthermore, the two ground
connections supply an alternative path through ground (a good conductor) to complete the circuit. The ground
connection closest to the power source could be at the generating plant, whereas the other is at the user’s location.
The third ground is to the case of the appliance, through the green ground wire, forcing the case, too, to be at zero
volts. The live or hot wire (hereafter referred to as “live/hot”) supplies voltage and current to operate the appliance.
Figure 10.44 shows a more pictorial version of how the three-wire system is connected through a three-prong plug
to an appliance.
10.6 • Household Wiring and Electrical Safety 449

![이미지](images/page088_img00.webp)

FIGURE 10.44 The standard three-prong plug can only be inserted in one way, to ensure proper function of the three-wire system.
Insulating plastic is color-coded to identify live/hot, neutral, and ground wires, but these codes vary around the
world. It is essential to determine the color code in your region. Striped coatings are sometimes used for the benefit
of those who are colorblind.
Grounding the case solves more than one problem. The simplest problem is worn insulation on the live/hot wire that
allows it to contact the case, as shown in Figure 10.45. Lacking a ground connection, a severe shock is possible. This
is particularly dangerous in the kitchen, where a good connection to ground is available through water on the floor or
a water faucet. With the ground connection intact, the circuit breaker will trip, forcing repair of the appliance.

![이미지](images/page088_img01.webp)

FIGURE 10.45 Worn insulation allows the live/hot wire to come into direct contact with the metal case of this appliance. (a) The ground
connection being broken, the person is severely shocked. The appliance may operate normally in this situation. (b) With a proper ground,
the circuit breaker trips, forcing repair of the appliance.
A ground fault circuit interrupter (GFCI) is a safety device found in updated kitchen and bathroom wiring that works
based on electromagnetic induction. GFCIs compare the currents in the live/hot and neutral wires. When live/hot
and neutral currents are not equal, it is almost always because current in the neutral is less than in the live/hot wire.
Then some of the current, called a leakage current, is returning to the voltage source by a path other than through
the neutral wire. It is assumed that this path presents a hazard. GFCIs are usually set to interrupt the circuit if the
leakage current is greater than 5 mA, the accepted maximum harmless shock. Even if the leakage current goes
safely to ground through an intact ground wire, the GFCI will trip, forcing repair of the leakage.
450 10 • Chapter Review
Chapter Review
Key Terms
ammeter instrument that measures current between two points in an electric circuit, measured
electromotive force (emf) energy produced per unit in volts
charge, drawn from a source that produces an potential drop loss of electric potential energy as a
electrical current current travels across a resistor, wire, or other
equivalent resistance resistance of a combination of component
resistors; it can be thought of as the resistance of a RC circuit circuit that contains both a resistor and a
single resistor that can replace a combination of capacitor
resistors in a series and/or parallel circuit shock hazard hazard in which an electric current
internal resistance amount of resistance to the flow passes through a person
of current within the voltage source terminal voltage potential difference measured
junction rule sum of all currents entering a junction across the terminals of a source when there is no
must equal the sum of all currents leaving the load attached
junction thermal hazard hazard in which an excessive electric
Kirchhoff’s rules set of two rules governing current current causes undesired thermal effects
and changes in potential in an electric circuit three-wire system wiring system used at present for
loop rule algebraic sum of changes in potential safety reasons, with live, neutral, and ground wires
around any closed circuit path (loop) must be zero voltmeter instrument that measures voltage
potential difference difference in electric potential
Key Equations
Terminal voltage of a single voltage source
Equivalent resistance of a series circuit
Equivalent resistance of a parallel circuit
Junction rule
Loop rule
Terminal voltage of N voltage sources in series
Terminal voltage of N voltage sources in parallel
Charge on a charging capacitor
Time constant
Current during charging of a capacitor
Charge on a discharging capacitor
Current during discharging of a capacitor
Summary
10.1 Electromotive Force internal resistance r. The emf is the work done
per charge to keep the potential difference of a
• All voltage sources have two fundamental parts:
source constant. The emf is equal to the
a source of electrical energy that has a
potential difference across the terminals when
characteristic electromotive force (emf), and an
10 • Chapter Review 451
no current is flowing. The internal resistance r of zero.
a voltage source affects the output voltage when • When calculating potential and current using
a current flows. Kirchhoff’s rules, a set of conventions must be
• The voltage output of a device is called its followed for determining the correct signs of
terminal voltage and is given by various terms.
, where I is the electric current • When multiple voltage sources are in series, their
and is positive when flowing away from the internal resistances add together and their emfs
positive terminal of the voltage source and r is add together to get the total values.
the internal resistance. • When multiple voltage sources are in parallel,
their internal resistances combine to an
10.2 Resistors in Series and Parallel
equivalent resistance that is less than the
• The equivalent resistance of an electrical circuit individual resistance and provides a higher
with resistors wired in a series is the sum of the current than a single cell.
individual resistances: • Solar cells can be wired in series or parallel to
provide increased voltage or current,
. respectively.
• Each resistor in a series circuit has the same 10.4 Electrical Measuring Instruments
amount of current flowing through it.
• Voltmeters measure voltage, and ammeters
• The potential drop, or power dissipation, across
measure current. Analog meters are based on
each individual resistor in a series is different,
the combination of a resistor and a galvanometer,
and their combined total is the power source
a device that gives an analog reading of current
input.
or voltage. Digital meters are based on analog-
• The equivalent resistance of an electrical circuit
to-digital converters and provide a discrete or
with resistors wired in parallel is less than the
digital measurement of the current or voltage.
lowest resistance of any of the components and
• A voltmeter is placed in parallel with the voltage
can be determined using the formula
source to receive full voltage and must have a
large resistance to limit its effect on the circuit.
• An ammeter is placed in series to get the full
current flowing through a branch and must have
• Each resistor in a parallel circuit has the same a small resistance to limit its effect on the circuit.
full voltage of the source applied to it. • Standard voltmeters and ammeters alter the
• The current flowing through each resistor in a circuit they are connected to and are thus limited
parallel circuit is different, depending on the in accuracy.
resistance. • Ohmmeters are used to measure resistance. The
• If a more complex connection of resistors is a component in which the resistance is to be
combination of series and parallel, it can be measured should be isolated (removed) from the
reduced to a single equivalent resistance by circuit.
identifying its various parts as series or parallel,
10.5 RC Circuits
reducing each to its equivalent, and continuing
until a single resistance is eventually reached. • An RC circuit is one that has both a resistor and a
capacitor.
10.3 Kirchhoff's Rules
• The time constant for an RC circuit is
• Kirchhoff’s rules can be used to analyze any • When an initially uncharged
circuit, simple or complex. The simpler series capacitor in series with a resistor is charged by a
and parallel connection rules are special cases of dc voltage source, the capacitor asymptotically
Kirchhoff’s rules. approaches the maximum charge.
• Kirchhoff’s first rule, also known as the junction • As the charge on the capacitor increases, the
rule, applies to the charge to a junction. Current current exponentially decreases from the initial
is the flow of charge; thus, whatever charge flows current:
into the junction must flow out. • If a capacitor with an initial charge Q is
• Kirchhoff’s second rule, also known as the loop discharged through a resistor starting at ,
rule, states that the voltage drop around a loop is then its charge decreases exponentially. The
452 10 • Chapter Review
current flows in the opposite direction, compared duration, and ac frequency.
to when it charges, and the magnitude of the • Circuit breakers and fuses interrupt excessive
charge decreases with time. currents to prevent thermal hazards.
• The three-wire system guards against thermal
10.6 Household Wiring and Electrical Safety
and shock hazards, utilizing live/hot, neutral, and

| ••Conc10.1 E | The two types of(excessive powerperson). Electricaare employed tohazards.Shock severity iseptual Questilectromotive For |
| --- | --- |
| 1 .2 .3 .10.2 R | What effect willrechargeable baused to rechargeA battery with anemf of 10.00 V is. As the baresistance triplethrough the loadShow that the poresistor is maximload resistor is ethe battery.esistors in Serie |
| 4 .5 .6 .7 .10.3 K | A voltage occursthe power dissipThe severity of amagnitude of theWould you prefewith a resistancea toaster, if youSuppose you areyou to put a resiresistors suppliethe requested vaavailable resistasmaller value asSome light bulbsincluding zero), othat are individuparallel. What isfilaments needeirchhoff's Rules |

lectric hazards are thermal ground wires, and grounding the neutral wire and
) and shock (current through a case of the appliance.
l safety systems and devices • A ground fault circuit interrupter (GFCI) prevents
revent thermal and shock shock by detecting the loss of current to
unintentional paths.
determined by current, path,
ns
ce

![이미지](images/page091_img00.webp)

he internal resistance of a
tery have on the energy being
the battery?
internal resistance of r and an
connected to a load resistor
ttery ages, the internal
. How much is the current
9 . Consider the circuit shown below. Does the
resistor reduced?
analysis of the circuit require Kirchhoff’s method,
wer dissipated by the load or can it be redrawn to simplify the circuit? If it is
um when the resistance of the a circuit of series and parallel connections, what
ual to the internal resistance of is the equivalent resistance?

![이미지](images/page091_img01.webp)

and Parallel
across an open switch. What is
ated by the open switch?
shock depends on the
current through your body.
to be in series or in parallel
, such as the heating element of
ere shocked by it? Explain.
10 . Do batteries in a circuit always supply power to a
doing a physics lab that asks
circuit, or can they absorb power in a circuit?
tor into a circuit, but all the
Give an example.
d have a larger resistance than
lue. How would you connect the
11 . What are the advantages and disadvantages of
ces to attempt to get the
connecting batteries in series? In parallel?
ed for?
12 . Semi-tractor trucks use four large 12-V
have three power settings (not
batteries. The starter system requires 24 V,
btained from multiple filaments
while normal operation of the truck’s other
lly switched and wired in
electrical components utilizes 12 V. How could
the minimum number of
the four batteries be connected to produce 24
for three power settings?
V? To produce 12 V? Why is 24 V better than 12
V for starting the truck’s engine (a very heavy
load)?
8 . Can all of the currents going into the junction
shown below be positive? Explain.
10 • Chapter Review 453
10.4 Electrical Measuring Instruments 10.5 RC Circuits

| 13 .14 .15 .Probl10.1 E | What would hseries with aWhat is the bmeasures a rWhy should ydirectly acrosbelow?emslectromotive |
| --- | --- |

appen if you placed a voltmeter in 16 . A battery, switch, capacitor, and lamp are
omponent to be tested? connected in series. Describe what happens to
the lamp when the switch is closed.
sic operation of an ohmmeter as it
sistor? 17 . When making an ECG measurement, it is
important to measure voltage variations over
u not connect an ammeter
small time intervals. The time is limited by the
s a voltage source as shown
RC constant of the circuit—it is not possible to
measure time variations shorter than RC. How

![이미지](images/page092_img00.webp)

would you manipulate R and C in the circuit to
allow the necessary measurements?
10.6 Household Wiring and Electrical Safety
18 . Why isn’t a short circuit necessarily a shock
hazard?
19 . We are often advised to not flick electric
switches with wet hands, dry your hand first. We
are also advised to never throw water on an
electric fire. Why?
Force is supplied to the motor? (d) Repeat these
calculations for when the battery connections
20 . A car battery with a 12-V emf and an internal
are corroded and add to the circuit.
resistance of is being charged with a
(Significant problems are caused by even small
current of 60 A. Note that in this process, the
amounts of unwanted resistance in low-voltage,
battery is being charged. (a) What is the
high-current applications.)
potential difference across its terminals? (b) At
what rate is thermal energy being dissipated in 23 . (a) What is the internal resistance of a voltage
the battery? (c) At what rate is electric energy source if its terminal potential drops by 2.00 V
being converted into chemical energy? when the current supplied increases by 5.00 A?
(b) Can the emf of the voltage source be found
21 . The label on a battery-powered radio
with the information supplied?
recommends the use of a rechargeable nickel-
cadmium cell (nicads), although it has a 1.25-V 24 . A person with body resistance between their
emf, whereas an alkaline cell has a 1.58-V emf. hands of accidentally grasps the
The radio has a resistance. (a) Draw a terminals of a 20.0-kV power supply. (Do NOT do
circuit diagram of the radio and its battery. Now, this!) (a) Draw a circuit diagram to represent the
calculate the power delivered to the radio (b) situation. (b) If the internal resistance of the
when using a nicad cells, each having an internal power supply is , what is the current
resistance of , and (c) when using an through their body? (c) What is the power
alkaline cell, having an internal resistance of dissipated in their body? (d) If the power supply
. (d) Does this difference seem is to be made safe by increasing its internal
significant, considering that the radio’s effective resistance, what should the internal resistance
resistance is lowered when its volume is turned be for the maximum current in this situation to
up? be 1.00 mA or less? (e) Will this modification
compromise the effectiveness of the power
22 . An automobile starter motor has an equivalent
supply for driving low-resistance devices?
resistance of and is supplied by a
Explain your reasoning.
12.0-V battery with a internal
resistance. (a) What is the current to the motor? 25 . A 12.0-V emf automobile battery has a terminal
(b) What voltage is applied to it? (c) What power voltage of 16.0 V when being charged by a
454 10 • Chapter Review
current of 10.0 A. (a) What is the battery’s dissipate if a total of 15.0 A passes through the
internal resistance? (b) What power is dissipated wires when the motor comes on? Assume
inside the battery? (c) At what rate (in ) negligible change in bulb resistance. (b) What
will its temperature increase if its mass is 20.0 power is consumed by the motor?
kg and it has a specific heat of
34 . Show that if two resistors and are
, assuming no heat escapes?
combined and one is much greater than the
10.2 Resistors in Series and Parallel other , (a) their series resistance is
very nearly equal to the greater resistance
26 . (a) What is the resistance of a , a
and (b) their parallel resistance is very nearly
, and a resistor connected in
equal to the smaller resistance .
series? (b) In parallel?
35 . Consider the circuit shown below. The terminal
27 . What are the largest and smallest resistances
voltage of the battery is (a) Find
you can obtain by connecting a , a
the equivalent resistance of the circuit. (b) Find
, and a resistor together?
the current through each resistor. (c) Find the
28 . An 1800-W toaster, a 1400-W speaker, and a potential drop across each resistor. (d) Find the
75-W lamp are plugged into the same outlet in a power dissipated by each resistor. (e) Find the
15-A fuse and 120-V circuit. (The three devices power supplied by the battery.
are in parallel when plugged into the same

![이미지](images/page093_img00.webp)

socket.) (a) What current is drawn by each
device? (b) Will this combination blow the 15-A
fuse?
29 . Your car’s 30.0-W headlight and 2.40-kW starter
are ordinarily connected in parallel in a 12.0-V
system. What power would one headlight and
the starter consume if connected in series to a
12.0-V battery? (Neglect any other resistance in
the circuit and any change in resistance in the 10.3 Kirchhoff's Rules
two devices.)
36 . Consider the circuit shown below. (a) Find the
30 . (a) Given a 48.0-V battery and and voltage across each resistor. (b)What is the
resistors, find the current and power for power supplied to the circuit and the power
each when connected in series. (b) Repeat when dissipated or consumed by the circuit?
the resistances are in parallel.

![이미지](images/page093_img01.webp)

31 . Referring to the example combining series and
parallel circuits and Figure 10.16, calculate in
the following two different ways: (a) from the
known values of and ; (b) using Ohm’s law
for . In both parts, explicitly show how you
follow the steps in the Series and Parallel
Resistors.
32 . Referring to Figure 10.16, (a) Calculate and
note how it compares with found in the first
two example problems in this module. (b) Find
the total power supplied by the source and
compare it with the sum of the powers
dissipated by the resistors.
37 . Consider the circuits shown below. (a) What is
33 . Refer to Figure 10.17 and the discussion of
the current through each resistor in part (a)? (b)
lights dimming when a heavy appliance comes
What is the current through each resistor in part
on. (a) Given the voltage source is 120 V, the
(b)? (c) What is the power dissipated or
wire resistance is and the bulb is
consumed by each circuit? (d) What is the power
nominally 75.0 W, what power will the bulb
10 • Chapter Review 455
supplied to each circuit?

![이미지](images/page094_img03.webp)

![이미지](images/page094_img00.webp)

41 . Consider the circuit shown below. (a) Find
(b) Find the power supplied
by the voltage sources. (c) Find the power dissipated
by the resistors.

![이미지](images/page094_img04.webp)

38 . Consider the circuit shown below. Find

| the |
| --- |
| the |

![이미지](images/page094_img01.webp)

42 . Consider the circuit shown below. Write the three
loop equations for the loops shown.

![이미지](images/page094_img05.webp)

39 . Consider ircuit shown below. Find

![이미지](images/page094_img02.webp)

43 . Consider the circuit shown below. Write equations
for the three currents in terms of R and V.

![이미지](images/page094_img06.webp)

40 . Consider ircuit shown below. Find
44 . Consider the circuit shown in the preceding
problem. Write equations for the power supplied
by the voltage sources and the power dissipated
by the resistors in terms of R and V.
456 10 • Chapter Review
45 . A child’s electronic toy is supplied by three

![이미지](images/page095_img01.webp)

1.58-V alkaline cells having internal resistances
of in series with a 1.53-V carbon-zinc
dry cell having a internal resistance.
The load resistance is . (a) Draw a circuit
diagram of the toy and its batteries. (b) What
current flows? (c) How much power is supplied
to the load? (d) What is the internal resistance of
the dry cell if it goes bad, resulting in only 0.500
W being supplied to the load?
46 . Apply the junction rule to Junction b shown below.
Is any new information gained by applying the
10.5 RC Circuits
junction rule at e?
49 . The timing device in an automobile’s

![이미지](images/page095_img00.webp)

intermittent wiper system is based on an RC
time constant and utilizes a capacitor
and a variable resistor. Over what range must R
be made to vary to achieve time constants from
2.00 to 15.0 s?
50 . A heart pacemaker fires 72 times a minute, each
time a 25.0-nF capacitor is charged (by a battery
in series with a resistor) to 0.632 of its full
voltage. What is the value of the resistance?
51 . The duration of a photographic flash is related to
an RC time constant, which is for a
certain camera. (a) If the resistance of the flash
lamp is during discharge, what is the
size of the capacitor supplying its energy? (b)
What is the time constant for charging the
47 . Apply the loop rule to Loop afedcba in the
capacitor, if the charging resistance is ?
preceding problem.
52 . A 2.00- and a capacitor can be
10.4 Electrical Measuring Instruments
connected in series or parallel, as can a 25.0-
48 . Suppose you measure the terminal voltage of a and a resistor. Calculate the four RC
1.585-V alkaline cell having an internal time constants possible from connecting the
resistance of by placing a resulting capacitance and resistance in series.
voltmeter across its terminals (see below). (a)
53 . A resistor, an uncharged
What current flows? (b) Find the terminal
capacitor, and a 6.16-V emf are connected in
voltage. (c) To see how close the measured
series. (a) What is the initial current? (b) What is
terminal voltage is to the emf, calculate their
the RC time constant? (c) What is the current
ratio.
after one time constant? (d) What is the voltage
on the capacitor after one time constant?
54 . A heart defibrillator being used on a patient has
an RC time constant of 10.0 ms due to the
resistance of the patient and the capacitance of
the defibrillator. (a) If the defibrillator has a
capacitance of what is the resistance of
the path through the patient? (You may neglect
the capacitance of the patient and the resistance
of the defibrillator.) (b) If the initial voltage is
12.0 kV, how long does it take to decline to
10 • Chapter Review 457
? the drainpipe and ground has a resistance of
. What is the smallest voltage on the
55 . An ECG monitor must have an RC time constant
case of the radio that could cause ventricular
less than to be able to measure
fibrillation?
variations in voltage over small time intervals.
(a) If the resistance of the circuit (due mostly to 62 . A man foolishly tries to fish a burning piece of
that of the patient’s chest) is , what is bread from a toaster with a metal butter knife
the maximum capacitance of the circuit? (b) and comes into contact with 120-V ac. He does
Would it be difficult in practice to limit the not even feel it since, luckily, he is wearing
capacitance to less than the value found in (a)? rubber-soled shoes. What is the minimum
resistance of the path the current follows
56 . Using the exact exponential treatment,
through the person?
determine how much time is required to charge
an initially uncharged 100-pF capacitor through 63 . (a) During surgery, a current as small as
a resistor to of its final voltage. applied directly to the heart may cause
ventricular fibrillation. If the resistance of the
57 . If you wish to take a picture of a bullet traveling
exposed heart is what is the smallest
at 500 m/s, then a very brief flash of light
voltage that poses this danger? (b) Does your
produced by an RC discharge through a flash
answer imply that special electrical safety
tube can limit blurring. Assuming 1.00 mm of
precautions are needed?
motion during one RC constant is acceptable,
and given that the flash is driven by a 64 . (a) What is the resistance of a 220-V ac short
capacitor, what is the resistance in the flash circuit that generates a peak power of 96.8 kW?
tube? (b) What would the average power be if the
voltage were 120 V ac?
10.6 Household Wiring and Electrical Safety
65 . A heart defibrillator passes 10.0 A through a
58 . (a) How much power is dissipated in a short
patient’s torso for 5.00 ms in an attempt to
circuit of 240-V ac through a resistance of
restore normal beating. (a) How much charge
? (b) What current flows?
passed? (b) What voltage was applied if 500 J of
59 . What voltage is involved in a 1.44-kW short energy was dissipated? (c) What was the path’s
circuit through a resistance? resistance? (d) Find the temperature increase
caused in the 8.00 kg of affected tissue.
60 . Find the current through a person and identify
the likely effect on her if she touches a 120-V ac 66 . A short circuit in a 120-V appliance cord has a
source: (a) if she is standing on a rubber mat and resistance. Calculate the temperature
offers a total resistance of ; (b) if she is rise of the 2.00 g of surrounding materials,
standing barefoot on wet grass and has a assuming their specific heat capacity is
resistance of only . and that it takes 0.0500 s for a
circuit breaker to interrupt the current. Is this
61 . While taking a bath, a person touches the metal
likely to be damaging?
case of a radio. The path through the person to
Additional Problems
67 . A circuit contains a D cell battery, a switch, a in series with the switch, the resistor and the
resistor, and four 20-mF capacitors battery. (a) What is the equivalent capacitance of
connected in series. (a) What is the equivalent the circuit? (b) What is the RC time constant? (c)
capacitance of the circuit? (b) What is the RC How long before the current decreases to
time constant? (c) How long before the current of the initial value once the switch is closed?
decreases to of the initial value once the
69 . Consider the circuit below. The battery has an emf of
switch is closed?
and an internal resistance of
68 . A circuit contains a D-cell battery, a switch, a (a) Find the equivalent resistance of the
resistor, and three 20-mF capacitors. The circuit and the current out of the battery. (b) Find the
capacitors are connected in parallel, and the current through each resistor. (c) Find the potential
parallel connection of capacitors are connected drop across each resistor. (d) Find the power
458 10 • Chapter Review
dissipated by each resistor. (e) Find the total power

![이미지](images/page097_img01.webp)

supplied by the batteries.

![이미지](images/page097_img00.webp)

73 . Three resistors are connect in series with
an AAA battery with a rating of 3 AmpHours. (a)
How long can the battery supply the resistors
with power? (b) If the resistors are connected in
70 . A homemade capacitor is constructed of 2
parallel, how long can the battery last?
sheets of aluminum foil with an area of 2.00
square meters, separated by paper, 0.05 mm 74 . Consider a circuit that consists of a real battery
thick, of the same area and a dielectric constant with an emf and an internal resistance of r
of 3.7. The homemade capacitor is connected in connected to a variable resistor R. (a) In order
series with a resistor, a switch, and a for the terminal voltage of the battery to be
6.00-V voltage source. (a) What is the RC time equal to the emf of the battery, what should the
constant of the circuit? (b) What is the initial resistance of the variable resistor be adjusted
current through the circuit, when the switch is to? (b) In order to get the maximum current from
closed? (c) How long does it take the current to the battery, what should the resistance of the
reach one third of its initial value? variable resistor be adjusted to? (c) In order for
the maximum power output of the battery to be
71 . A student makes a homemade resistor from a
reached, what should the resistance of the
graphite pencil 5.00 cm long, where the graphite
variable resistor be set to?
is 0.05 mm in diameter. The resistivity of the
graphite is . The 75 . Consider the circuit shown below. What is the
homemade resistor is place in series with a energy stored in each capacitor after the switch has
switch, a 10.00-mF uncharged capacitor and a been closed for a very long time?
0.50-V power source. (a) What is the RC time

![이미지](images/page097_img02.webp)

constant of the circuit? (b) What is the potential
drop across the pencil 1.00 s after the switch is
closed?
72 . The rather simple circuit shown below is known as a
voltage divider. The symbol consisting of three
horizontal lines is represents “ground” and can be
defined as the point where the potential is zero. The
76 . Consider a circuit consisting of a battery with an
voltage divider is widely used in circuits and a single
emf and an internal resistance r connected in
voltage source can be used to provide reduced
series with a resistor R and a capacitor C. Show
voltage to a load resistor as shown in the second
that the total energy supplied by the battery
part of the figure. (a) What is the output voltage
while charging the capacitor is equal to .
of circuit (a) in terms of (b) What
is the output voltage of circuit (b) in terms of 77 . Consider the circuit shown below. The terminal
voltages of the batteries are shown. (a) Find the
equivalent resistance of the circuit and the current
out of the battery. (b) Find the current through each
resistor. (c) Find the potential drop across each
resistor. (d) Find the power dissipated by each
resistor. (e) Find the total power supplied by the
batteries.
10 • Chapter Review 459

![이미지](images/page098_img03.webp)

![이미지](images/page098_img00.webp)

78 . Consider the circuit shown below. (a) What is the
terminal voltage of the battery? (b) What is the
potential drop across resistor ?

![이미지](images/page098_img01.webp)

83 . Apply the loop rule to Loop akledcba in the
preceding problem.
84 . Find the currents flowing in the circuit in the
preceding problem. Explicitly show how you
79 . Consider the circuit shown below. (a)Determine the follow the steps in the Problem-Solving Strategy:
equivalent resistance and the current from the Series and Parallel Resistors.
battery with switch open. (b) Determine the
85 . Consider the circuit shown below. (a) Find the
equivalent resistance and the current from the
current through each resistor. (b) Check the
battery with switch closed.
calculations by analyzing the power in the circuit.

![이미지](images/page098_img02.webp)

![이미지](images/page098_img04.webp)

80 . Two resistors, one having a resistance of ,
86 . A flashing lamp in a Christmas earring is based
are connected in parallel to produce a total
on an RC discharge of a capacitor through its
resistance of . (a) What is the value of the
resistance. The effective duration of the flash is
second resistance? (b) What is unreasonable
0.250 s, during which it produces an average
about this result? (c) Which assumptions are
0.500 W from an average 3.00 V. (a) What
unreasonable or inconsistent?
energy does it dissipate? (b) How much charge
81 . Two resistors, one having a resistance of moves through the lamp? (c) Find the
are connected in series to produce a capacitance. (d) What is the resistance of the
total resistance of . (a) What is the lamp? (Since average values are given for some
value of the second resistance? (b) What is quantities, the shape of the pulse profile is not
unreasonable about this result? (c) Which needed.)
assumptions are unreasonable or inconsistent?
87 . A capacitor charged to 450 V is
82 . Apply the junction rule at point a shown below. discharged through a resistor. (a) Find
the time constant. (b) Calculate the temperature
460 10 • Chapter Review
increase of the resistor, given that its mass is Calculate the new resistance, assuming it is pure
2.50 g and its specific heat is carbon. (d) Does this change in resistance seem
noting that most of the thermal energy is significant?
retained in the short time of the discharge. (c)
Challenge Problems
88 . Some camera flashes use flash tubes that essentially consists of a coil of wire with a small
require a high voltage. They obtain a high voltage resistance and a pointer with a scale attached.
by charging capacitors in parallel and then When current runs through the coil, the pointer
internally changing the connections of the turns; the amount the pointer turns is proportional
capacitors to place them in series. Consider a to the amount of current running through the coil.
circuit that uses four AAA batteries connected in Galvanometers can be used to make an ammeter if a
series to charge six 10-mF capacitors through an resistor is placed in parallel with the galvanometer.
equivalent resistance of . The connections Consider a galvanometer that has a resistance of
are then switched internally to place the and gives a full scale reading when a
capacitors in series. The capacitors discharge current runs through it. The galvanometer is to be
through a lamp with a resistance of . (a) used to make an ammeter that has a full scale
What is the RC time constant and the initial reading of 10.00 A, as shown below. Recall that an
current out of the batteries while they are ammeter is connected in series with the circuit of
connected in parallel? (b) How long does it take interest, so all 10 A must run through the meter. (a)
for the capacitors to charge to of the What is the current through the parallel resistor in
terminal voltages of the batteries? (c) What is the meter? (b) What is the voltage across the
the RC time constant and the initial current of parallel resistor? (c) What is the resistance of the
the capacitors connected in series assuming it series resistor?
discharges at of full charge? (d) How long

![이미지](images/page099_img01.webp)

does it take the current to decrease to of
the initial value?
89 . Consider the circuit shown below. Each battery
has an emf of 1.50 V and an internal resistance
of (a) What is the current through the
external resistor, which has a resistance of
10.00 ohms? (b) What is the terminal voltage of
each battery?

![이미지](images/page099_img00.webp)

91 . Analog meters use a galvanometer, which
essentially consists of a coil of wire with a small
resistance and a pointer with a scale attached.
When current runs through the coil, the point turns;
the amount the pointer turns is proportional to the
amount of current running through the coil.
Galvanometers can be used to make a voltmeter if a
resistor is placed in series with the galvanometer.
Consider a galvanometer that has a resistance of
and gives a full scale reading when a
current runs through it. The galvanometer is to be
used to make an voltmeter that has a full scale
90 . Analog meters use a galvanometer, which
10 • Chapter Review 461
reading of 10.00 V, as shown below. Recall that a

![이미지](images/page100_img02.webp)

voltmeter is connected in parallel with the
component of interest, so the meter must have a
high resistance or it will change the current running
through the component. (a) What is the potential
drop across the series resistor in the meter? (b)
What is the resistance of the parallel resistor?

![이미지](images/page100_img00.webp)

94 . Consider the circuit below. (a) What is the initial
current through resistor when the switch is
closed? (b) What is the current through resistor
when the capacitor is fully charged, long after the
switch is closed? (c) What happens if the switch is
opened after it has been closed for some time? (d) If
the switch has been closed for a time period long
enough for the capacitor to become fully charged,
and then the switch is opened, how long before the
current through resistor reaches half of its initial
value?

![이미지](images/page100_img03.webp)

92 . Consider the circuit shown below. Find

![이미지](images/page100_img01.webp)

95 . Consider the infinitely long chain of resistors shown
below. What is the resistance between terminals a
and b?

![이미지](images/page100_img04.webp)

93 . Consider the circuit below. (a) What is the RC time
constant of the circuit? (b) What is the initial current
in the circuit once the switch is closed? (c) How
much time passes between the instant the switch is
closed and the time the current has reached half of
the initial current?
96 . Consider the circuit below. The capacitor has a
capacitance of 10 mF. The switch is closed and
after a long time the capacitor is fully charged. (a)
What is the current through each resistor a long
time after the switch is closed? (b) What is the
voltage across each resistor a long time after the
switch is closed? (c) What is the voltage across
the capacitor a long time after the switch is
462 10 • Chapter Review
closed? (d) What is the charge on the capacitor a dorm room, but you are worried that you will
long time after the switch is closed? (e) The overload the circuit and trip the 15.00-A, 120-V
switch is then opened. The capacitor discharges circuit breaker, which supplies your dorm room.
through the resistors. How long from the time In your dorm room, you have four 100.00-W
before the current drops to one fifth of the initial incandescent lamps and a 1500.00-W space
value? heater. (a) What is the power rating of the
immersion heater? (b) Will it trip the breaker

![이미지](images/page101_img00.webp)

when everything is turned on? (c) If it you
replace the incandescent bulbs with 18.00-W
LED, will the breaker trip when everything is
turned on?
98 . Find the resistance that must be placed in series
with a galvanometer having a
sensitivity (the same as the one discussed in the
text) to allow it to be used as a voltmeter with a
3000-V full-scale reading. Include a circuit
diagram with your solution.
99 . Find the resistance that must be placed in
parallel with a galvanometer having a
1.00-mA sensitivity (the same as the one
97 . A 120-V immersion heater consists of a coil of discussed in the text) to allow it to be used as an
wire that is placed in a cup to boil the water. The ammeter with a 25.0-A full-scale reading.
heater can boil one cup of water in Include a circuit diagram with your solution.
180.00 seconds. You buy one to use in your
CHAPTER 15
Alternating-Current Circuits

![이미지](images/page102_img00.webp)

| FIGURE 15.1 The current we draw into our houses is an alternating current (ac). Power lines transmit ac to our neighborhoods, wherelocal power stations and transformers distribute it to our homes. In this chapter, we discuss how a transformer works and how it allows usto transmit power at very high voltages and minimal heating losses across the lines. |
| --- |

CHAPTER OUTLINE
15.1 AC Sources
15.2 Simple AC Circuits
15.3 RLC Series Circuits with AC
15.4 Power in an AC Circuit
15.5 Resonance in an AC Circuit
15.6 Transformers
INTRODUCTION Electric power is delivered to our homes by alternating current (ac) through high-voltage
transmission lines. As explained in Transformers, transformers can then change the amplitude of the alternating
potential difference to a more useful form. This lets us transmit power at very high voltages, minimizing resistive
heating losses in the lines, and then furnish that power to homes at lower, safer voltages. Because constant
potential differences are unaffected by transformers, this capability is more difficult to achieve with direct-current
transmission.
In this chapter, we use Kirchhoff’s laws to analyze four simple circuits in which ac flows. We have discussed the use
of the resistor, capacitor, and inductor in circuits with batteries. These components are also part of ac circuits.
However, because ac is required, the constant source of emf supplied by a battery is replaced by an ac voltage
source, which produces an oscillating emf.
624 15 • Alternating-Current Circuits
15.1 AC Sources
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Explain the differences between direct current (dc) and alternating current (ac)
• Define characteristic features of alternating current and voltage, such as the amplitude or peak and the
frequency
Most examples dealt with so far in this book, particularly those using batteries, have constant-voltage sources. Thus,
once the current is established, it is constant. Direct current (dc) is the flow of electric charge in only one direction.
It is the steady state of a constant-voltage circuit.
Most well-known applications, however, use a time-varying voltage source. Alternating current (ac) is the flow of
electric charge that periodically reverses direction. An ac is produced by an alternating emf, which is generated in a
power plant, as described in Induced Electric Fields. If the ac source varies periodically, particularly sinusoidally, the
circuit is known as an ac circuit. Examples include the commercial and residential power that serves so many of our
needs.
The ac voltages and frequencies commonly used in businesses and homes vary around the world. In a typical house,
the potential difference between the two sides of an electrical outlet alternates sinusoidally with a frequency of 60
or 50 Hz and an amplitude of 170 or 311 V, depending on whether you live in the United States or Europe,
respectively. Most people know the potential difference for electrical outlets is 120 V or 220 V in the US or Europe,
but as explained later in the chapter, these voltages are not the peak values given here but rather are related to the
common voltages we see in our electrical outlets. Figure 15.2 shows graphs of voltage and current versus time for
typical dc and ac power in the United States.

![이미지](images/page103_img00.webp)

FIGURE 15.2 (a) The dc voltage and current are constant in time, once the current is established. (b) The voltage and current versus time
are quite different for ac power. In this example, which shows 60-Hz ac power and time t in milliseconds, voltage and current are sinusoidal
and are in phase for a simple resistance circuit. The frequencies and peak voltages of ac sources differ greatly.
Suppose we hook up a resistor to an ac voltage source and determine how the voltage and current vary in time
across the resistor. Figure 15.3 shows a schematic of a simple circuit with an ac voltage source. The voltage
fluctuates sinusoidally with time at a fixed frequency, as shown, on either the battery terminals or the resistor.
Therefore, the ac voltage, or the “voltage at a plug,” can be given by
15.1
where v is the voltage at time t, is the peak voltage, and is the angular frequency in radians per second. For a
typical house in the United States, and , whereas in Europe, and
For this simple resistance circuit, , so the ac current, meaning the current that fluctuates sinusoidally with
time at a fixed frequency, is
15.2
where i is the current at time t and is the peak current and is equal to . For this example, the voltage and
current are said to be in phase, meaning that their sinusoidal functional forms have peaks, troughs, and nodes in the
15.2 • Simple AC Circuits 625
same place. They oscillate in sync with each other, as shown in Figure 15.2(b). In these equations, and throughout
this chapter, we use lowercase letters (such as i) to indicate instantaneous values and capital letters (such as I) to
indicate maximum, or peak, values.

![이미지](images/page104_img00.webp)

FIGURE 15.3 The potential difference V between the terminals of an ac voltage source fluctuates, so the source and the resistor have ac
sine waves on top of each other. The mathematical expression for v is given by
Current in the resistor alternates back and forth just like the driving voltage, since . If the resistor is a
fluorescent light bulb, for example, it brightens and dims 120 times per second as the current repeatedly goes
through zero. A 120-Hz flicker is too rapid for your eyes to detect, but if you wave your hand back and forth between
your face and a fluorescent light, you will see the stroboscopic effect of ac.
CHECK YOUR UNDERSTANDING 15.1
If a European ac voltage source is considered, what is the time difference between the zero crossings on an ac
voltage-versus-time graph?
15.2 Simple AC Circuits
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Interpret phasor diagrams and apply them to ac circuits with resistors, capacitors, and inductors
• Define the reactance for a resistor, capacitor, and inductor to help understand how current in the circuit
behaves compared to each of these devices
In this section, we study simple models of ac voltage sources connected to three circuit components: (1) a resistor,
(2) a capacitor, and (3) an inductor. The power furnished by an ac voltage source has an emf given by
as shown in Figure 15.4. This sine function assumes we start recording the voltage when it is at a time of
A phase constant may be involved that shifts the function when we start measuring voltages, similar to the
phase constant in the waves we studied in Waves (http://openstax.org/books/university-physics-volume-1/pages/
16-introduction). However, because we are free to choose when we start examining the voltage, we can ignore this
phase constant for now. We can measure this voltage across the circuit components using one of two methods: (1) a
quantitative approach based on our knowledge of circuits, or (2) a graphical approach that is explained in the
coming sections.
626 15 • Alternating-Current Circuits

![이미지](images/page105_img00.webp)

FIGURE 15.4 (a) The output of an ac generator. (b) Symbol used to represent an ac voltage source in a circuit diagram.
Resistor
First, consider a resistor connected across an ac voltage source. From Kirchhoff’s loop rule, the instantaneous
voltage across the resistor of Figure 15.5(a) is
and the instantaneous current through the resistor is

![이미지](images/page105_img01.webp)

FIGURE 15.5 (a) A resistor connected across an ac voltage source. (b) The current through the resistor and the voltage across
the resistor. The two quantities are in phase.
Here, is the amplitude of the time-varying current. Plots of and are shown in Figure 15.5(b).
Both curves reach their maxima and minima at the same times, that is, the current through and the voltage across
the resistor are in phase.
Graphical representations of the phase relationships between current and voltage are often useful in the analysis of
ac circuits. Such representations are called phasor diagrams. The phasor diagram for is shown in Figure
15.6(a), with the current on the vertical axis. The arrow (or phasor) is rotating counterclockwise at a constant
angular frequency so we are viewing it at one instant in time. If the length of the arrow corresponds to the current
15.2 • Simple AC Circuits 627
amplitude the projection of the rotating arrow onto the vertical axis is which is the
instantaneous current.

![이미지](images/page106_img00.webp)

FIGURE 15.6 (a) The phasor diagram representing the current through the resistor of Figure 15.5. (b) The phasor diagram representing both
and .
The vertical axis on a phasor diagram could be either the voltage or the current, depending on the phasor that is
being examined. In addition, several quantities can be depicted on the same phasor diagram. For example, both the
current and the voltage are shown in the diagram of Figure 15.6(b). Since they have the same frequency
and are in phase, their phasors point in the same direction and rotate together. The relative lengths of the two
phasors are arbitrary because they represent different quantities; however, the ratio of the lengths of the two
phasors can be represented by the resistance, since one is a voltage phasor and the other is a current phasor.
Capacitor
Now let’s consider a capacitor connected across an ac voltage source. From Kirchhoff’s loop rule, the instantaneous
voltage across the capacitor of Figure 15.7(a) is
Recall that the charge in a capacitor is given by This is true at any time measured in the ac cycle of
voltage. Consequently, the instantaneous charge on the capacitor is
Since the current in the circuit is the rate at which charge enters (or leaves) the capacitor,
where is the current amplitude. Using the trigonometric relationship we may
express the instantaneous current as
Dividing by , we obtain an equation that looks similar to Ohm’s law:
15.3
The quantity is analogous to resistance in a dc circuit in the sense that both quantities are a ratio of a voltage to
a current. As a result, they have the same unit, the ohm. Keep in mind, however, that a capacitor stores and
discharges electric energy, whereas a resistor dissipates it. The quantity is known as the capacitive reactance
of the capacitor, or the opposition of a capacitor to a change in current. It depends inversely on the frequency of the
ac source—high frequency leads to low capacitive reactance.
628 15 • Alternating-Current Circuits

![이미지](images/page107_img00.webp)

FIGURE 15.7 (a) A capacitor connected across an ac generator. (b) The current through the capacitor and the voltage across
the capacitor. Notice that leads by rad.
A comparison of the expressions for and shows that there is a phase difference of between
them. When these two quantities are plotted together, the current peaks a quarter cycle (or ) ahead of the
voltage, as illustrated in Figure 15.7(b). The current through a capacitor leads the voltage across a capacitor by
or a quarter of a cycle.
The corresponding phasor diagram is shown in Figure 15.8. Here, the relationship between and is
represented by having their phasors rotate at the same angular frequency, with the current phasor leading by

![이미지](images/page107_img01.webp)

FIGURE 15.8 The phasor diagram for the capacitor of Figure 15.7. The current phasor leads the voltage phasor by rad as they both
rotate with the same angular frequency.
To this point, we have exclusively been using peak values of the current or voltage in our discussion, namely, and
However, if we average out the values of current or voltage, these values are zero. Therefore, we often use a
second convention called the root mean square value, or rms value, in discussions of current and voltage. The rms
operates in reverse of the terminology. First, you square the function, next, you take the mean, and then, you find
the square root. As a result, the rms values of current and voltage are not zero. Appliances and devices are
commonly quoted with rms values for their operations, rather than peak values. We indicate rms values with a
subscript attached to a capital letter (such as ).
Although a capacitor is basically an open circuit, an rms current, or the root mean square of the current, appears in
a circuit with an ac voltage applied to a capacitor. Consider that
15.4
where is the peak current in an ac system. The rms voltage, or the root mean square of the voltage, is
15.5
15.2 • Simple AC Circuits 629
where is the peak voltage in an ac system. The rms current appears because the voltage is continually reversing,
charging, and discharging the capacitor. If the frequency goes to zero, which would be a dc voltage, tends to
infinity, and the current is zero once the capacitor is charged. At very high frequencies, the capacitor’s reactance
tends to zero—it has a negligible reactance and does not impede the current (it acts like a simple wire).
Inductor
Lastly, let’s consider an inductor connected to an ac voltage source. From Kirchhoff’s loop rule, the voltage across
the inductor L of Figure 15.9(a) is
15.6
The emf across an inductor is equal to however, the potential difference across the inductor is
, because if we consider that the voltage around the loop must equal zero, the voltage gained
from the ac source must dissipate through the inductor. Therefore, connecting this with the ac voltage source, we
have

![이미지](images/page108_img00.webp)

FIGURE 15.9 (a) An inductor connected across an ac generator. (b) The current through the inductor and the voltage across the
inductor. Here lags by rad.
The current is found by integrating this equation. Since the circuit does not contain a source of constant emf,
there is no steady current in the circuit. Hence, we can set the constant of integration, which represents the steady
current in the circuit, equal to zero, and we have
15.7
where The relationship between and may also be written in a form analogous to Ohm’s law:
15.8
The quantity is known as the inductive reactance of the inductor, or the opposition of an inductor to a change in
current; its unit is also the ohm. Note that varies directly as the frequency of the ac source—high frequency
causes high inductive reactance.
A phase difference of rad occurs between the current through and the voltage across the inductor. From
Equation 15.6 and Equation 15.7, the current through an inductor lags the potential difference across an inductor by
, or a quarter of a cycle. The phasor diagram for this case is shown in Figure 15.10.
630 15 • Alternating-Current Circuits

![이미지](images/page109_img00.webp)

FIGURE 15.10 The phasor diagram for the inductor of Figure 15.9. The current phasor lags the voltage phasor by rad as they both
rotate with the same angular frequency.
INTERACTIVE
An animation from the University of New South Wales AC Circuits (https://openstax.org/l/21accircuits) illustrates
some of the concepts we discuss in this chapter. They also include wave and phasor diagrams that evolve over time
so that you can get a better picture of how each changes over time.
EXAMPLE 15.1
Simple AC Circuits
An ac generator produces an emf of amplitude 10 V at a frequency Determine the voltages across and
the currents through the circuit elements when the generator is connected to (a) a resistor, (b) a
capacitor, and (c) a 15-mH inductor.
Strategy
The entire AC voltage across each device is the same as the source voltage. We can find the currents by finding the
reactance X of each device and solving for the peak current using
Solution
The voltage across the terminals of the source is
where is the angular frequency. Since v(t) is also the voltage across each of the elements,
we have
a. When the amplitude of the current through the resistor is
so
15.3 • RLC Series Circuits with AC 631
b. From Equation 15.3, the capacitive reactance is
so the maximum value of the current is
and the instantaneous current is given by
c. From Equation 15.8, the inductive reactance is
The maximum current is therefore
and the instantaneous current is
Significance
Although the voltage across each device is the same, the peak current has different values, depending on the
reactance. The reactance for each device depends on the values of resistance, capacitance, or inductance.
CHECK YOUR UNDERSTANDING 15.2
Repeat Example 15.1 for an ac source of amplitude 20 V and frequency 100 Hz.
15.3 RLC Series Circuits with AC
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Describe how the current varies in a resistor, a capacitor, and an inductor while in series with an ac power
source
• Use phasors to understand the phase angle of a resistor, capacitor, and inductor ac circuit and to
understand what that phase angle means
• Calculate the impedance of a circuit
The ac circuit shown in Figure 15.11, called an RLC series circuit, is a series combination of a resistor, capacitor, and
inductor connected across an ac source. It produces an emf of
632 15 • Alternating-Current Circuits

![이미지](images/page111_img00.webp)

FIGURE 15.11 (a) An RLC series circuit. (b) A comparison of the generator output voltage and the current. The value of the phase difference
depends on the values of R, C, and L.
Since the elements are in series, the same current flows through each element at all points in time. The relative
phase between the current and the emf is not obvious when all three elements are present. Consequently, we
represent the current by the general expression
where is the current amplitude and is the phase angle between the current and the applied voltage. The phase
angle is thus the amount by which the voltage and current are out of phase with each other in a circuit. Our task is to
find
A phasor diagram involving is helpful for analyzing the circuit. As shown in Figure
15.12, the phasor representing points in the same direction as the phasor for its amplitude is
The phasor lags the i(t) phasor by rad and has the amplitude The phasor for leads the
i(t) phasor by rad and has the amplitude

![이미지](images/page111_img01.webp)

FIGURE 15.12 The phasor diagram for the RLC series circuit of Figure 15.11.
At any instant, the voltage across the RLC combination is the emf of the source. Since
a component of a sum of vectors is the sum of the components of the individual vectors—for example,
—the projection of the vector sum of phasors onto the vertical axis is the sum of the vertical
projections of the individual phasors. Hence, if we add vectorially the phasors representing
and then find the projection of the resultant onto the vertical axis, we obtain
15.3 • RLC Series Circuits with AC 633
The vector sum of the phasors is shown in Figure 15.13. The resultant phasor has an amplitude and is directed at
an angle with respect to the or , phasor. The projection of this resultant phasor onto the vertical axis is
We can easily determine the unknown quantities and from the geometry of the phasor
diagram. For the phase angle,
and after cancellation of this becomes
15.9
Furthermore, from the Pythagorean theorem,

![이미지](images/page112_img00.webp)

FIGURE 15.13 The resultant of the phasors for , , and is equal to the phasor for The i(t) phasor (not
shown) is aligned with the phasor.
The current amplitude is therefore the ac version of Ohm’s law:
15.10
where
15.11
is known as the impedance of the circuit. Its unit is the ohm, and it is the ac analog to resistance in a dc circuit,
which measures the combined effect of resistance, capacitive reactance, and inductive reactance (Figure 15.14).
634 15 • Alternating-Current Circuits

![이미지](images/page113_img00.webp)

FIGURE 15.14 Power capacitors are used to balance the impedance of the effective inductance in transmission lines.
The RLC circuit is analogous to the wheel of a car driven over a corrugated road (Figure 15.15). The regularly spaced
bumps in the road drive the wheel up and down; in the same way, a voltage source increases and decreases. The
shock absorber acts like the resistance of the RLC circuit, damping and limiting the amplitude of the oscillation.
Energy within the wheel system goes back and forth between kinetic and potential energy stored in the car spring,
analogous to the shift between a maximum current, with energy stored in an inductor, and no current, with energy
stored in the electric field of a capacitor. The amplitude of the wheel’s motion is at a maximum if the bumps in the
road are hit at the resonant frequency, which we describe in more detail in Resonance in an AC Circuit.

![이미지](images/page113_img01.webp)

FIGURE 15.15 On a car, the shock absorber damps motion and dissipates energy. This is much like the resistance in an RLC circuit. The
mass and spring determine the resonant frequency.
PROBLEM-SOLVING STRATEGY
AC Circuits
To analyze an ac circuit containing resistors, capacitors, and inductors, it is helpful to think of each device’s
reactance and find the equivalent reactance using the rules we used for equivalent resistance in the past. Phasors
15.3 • RLC Series Circuits with AC 635
are a great method to determine whether the emf of the circuit has positive or negative phase (namely, leads or lags
other values). A mnemonic device of “ELI the ICE man” is sometimes used to remember that the emf (E) leads the
current (I) in an inductor (L) and the current (I) leads the emf (E) in a capacitor (C).
Use the following steps to determine the emf of the circuit by phasors:
1. Draw the phasors for voltage across each device: resistor, capacitor, and inductor, including the phase angle in
the circuit.
2. If there is both a capacitor and an inductor, find the net voltage from these two phasors, since they are
antiparallel.
3. Find the equivalent phasor from the phasor in step 2 and the resistor’s phasor using trigonometry or
components of the phasors. The equivalent phasor found is the emf of the circuit.
EXAMPLE 15.2
An RLC Series Circuit
The output of an ac generator connected to an RLC series combination has a frequency of 200 Hz and an amplitude
of 0.100 V. If and what are (a) the capacitive reactance, (b)
the inductive reactance, (c) the impedance, (d) the current amplitude, and (e) the phase difference between the
current and the emf of the generator?
Strategy
The reactances and impedance in (a)–(c) are found by substitutions into Equation 15.3, Equation 15.8, and Equation
15.11, respectively. The current amplitude is calculated from the peak voltage and the impedance. The phase
difference between the current and the emf is calculated by the inverse tangent of the difference between the
reactances divided by the resistance.
Solution
a. From Equation 15.3, the capacitive reactance is
b. From Equation 15.8, the inductive reactance is
c. Substituting the values of R, , and into Equation 15.11, we obtain for the impedance
d. The current amplitude is
e. From Equation 15.9, the phase difference between the current and the emf is
Significance
The phase angle is positive because the reactance of the inductor is larger than the reactance of the capacitor.
CHECK YOUR UNDERSTANDING 15.3
Find the voltages across the resistor, the capacitor, and the inductor in the circuit of Figure 15.11 using
as the output of the ac generator.
636 15 • Alternating-Current Circuits
15.4 Power in an AC Circuit
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Describe how average power from an ac circuit can be written in terms of peak current and voltage and of
rms current and voltage
• Determine the relationship between the phase angle of the current and voltage and the average power,
known as the power factor
A circuit element dissipates or produces power according to where I is the current through the element
and V is the voltage across it. Since the current and the voltage both depend on time in an ac circuit, the
instantaneous power is also time dependent. A plot of p(t) for various circuit elements is shown in
Figure 15.16. For a resistor, i(t) and v(t) are in phase and therefore always have the same sign (see Figure 15.5). For
a capacitor or inductor, the relative signs of i(t) and v(t) vary over a cycle due to their phase differences (see Figure
15.7 and Figure 15.9). Consequently, p(t) is positive at some times and negative at others, indicating that capacitive
and inductive elements produce power at some instants and absorb it at others.
15.4 • Power in an AC Circuit 637

![이미지](images/page116_img00.webp)

FIGURE 15.16 Graph of instantaneous power for various circuit elements. (a) For the resistor, whereas for (b) the capacitor
and (c) the inductor, (d) For the source, which may be positive, negative, or zero, depending on
Because instantaneous power varies in both magnitude and sign over a cycle, it seldom has any practical
importance. What we’re almost always concerned with is the power averaged over time, which we refer to as the
average power. It is defined by the time average of the instantaneous power over one cycle:
where is the period of the oscillations. With the substitutions and
this integral becomes
638 15 • Alternating-Current Circuits
Using the trigonometric relation we obtain
Evaluation of these two integrals yields
and
Hence, the average power associated with a circuit element is given by
15.12
In engineering applications, is known as the power factor, which is the amount by which the power delivered
in the circuit is less than the theoretical maximum of the circuit due to voltage and current being out of phase. For a
resistor, so the average power dissipated is
A comparison of p(t) and is shown in Figure 15.16(d). To make look like its dc counterpart,
we use the rms values of the current and the voltage. By definition, these are
where
With we obtain
We may then write for the average power dissipated by a resistor,
15.13
This equation further emphasizes why the rms value is chosen in discussion rather than peak values. Both equations
for average power are correct for Equation 15.13, but the rms values in the formula give a cleaner representation, so
the extra factor of 1/2 is not necessary.
Alternating voltages and currents are usually described in terms of their rms values. For example, the 110 V from a
household outlet is an rms value. The amplitude of this source is Because most ac meters are
calibrated in terms of rms values, a typical ac voltmeter placed across a household outlet will read 110 V.
For a capacitor and an inductor, respectively. Since we find from
Equation 15.12 that the average power dissipated by either of these elements is Capacitors and inductors
15.4 • Power in an AC Circuit 639
absorb energy from the circuit during one half-cycle and then discharge it back to the circuit during the other half-
cycle. This behavior is illustrated in the plots of Figure 15.16, (b) and (c), which show p(t) oscillating sinusoidally
about zero.
The phase angle for an ac generator may have any value. If the generator produces power; if
it absorbs power. In terms of rms values, the average power of an ac generator is written as
For the generator in an RLC circuit,
and
Hence the average power of the generator is
15.14
This can also be written as
which designates that the power produced by the generator is dissipated in the resistor. As we can see, Ohm’s law
for the rms ac is found by dividing the rms voltage by the impedance.
EXAMPLE 15.3
Power Output of a Generator
An ac generator whose emf is given by
is connected to an RLC circuit for which , , and . (a) What is the
rms voltage across the generator? (b) What is the impedance of the circuit? (c) What is the average power output of
the generator?
Strategy
The rms voltage is the amplitude of the voltage times . The impedance of the circuit involves the resistance
and the reactances of the capacitor and the inductor. The average power is calculated by Equation 15.14, or more
specifically, the last part of the equation, because we have the impedance of the circuit Z, the rms voltage , and
the resistance R.
Solution
a. Since the rms voltage across the generator is
b. The impedance of the circuit is
640 15 • Alternating-Current Circuits
c. From Equation 15.14, the average power transferred to the circuit is
Significance
If the resistance is much larger than the reactance of the capacitor or inductor, the average power is a dc circuit
equation of where V replaces the rms voltage.
CHECK YOUR UNDERSTANDING 15.4
An ac voltmeter attached across the terminals of a 45-Hz ac generator reads 7.07 V. Write an expression for the emf
of the generator.
CHECK YOUR UNDERSTANDING 15.5
Show that the rms voltages across a resistor, a capacitor, and an inductor in an ac circuit where the rms current is
are given by respectively. Determine these values for the components of the
RLC circuit of Equation 15.12.
15.5 Resonance in an AC Circuit
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Determine the peak ac resonant angular frequency for a RLC circuit
• Explain the width of the average power versus angular frequency curve and its significance using terms
like bandwidth and quality factor
In the RLC series circuit of Figure 15.11, the current amplitude is, from Equation 15.10,
15.15
If we can vary the frequency of the ac generator while keeping the amplitude of its output voltage constant, then the
current changes accordingly. A plot of versus is shown in Figure 15.17.
15.5 • Resonance in an AC Circuit 641

![이미지](images/page120_img00.webp)

FIGURE 15.17 At an RLC circuit’s resonant frequency, the current amplitude is at its maximum value.
In Oscillations (http://openstax.org/books/university-physics-volume-1/pages/15-introduction), we encountered a
similar graph where the amplitude of a damped harmonic oscillator was plotted against the angular frequency of a
sinusoidal driving force (see Forced Oscillations (http://openstax.org/books/university-physics-volume-1/pages/
15-6-forced-oscillations)). This similarity is more than just a coincidence, as shown earlier by the application of
Kirchhoff’s loop rule to the circuit of Figure 15.11. This yields
15.16
or
where we substituted dq(t)/dt for i(t). A comparison of Equation 15.16 and, from Oscillations (http://openstax.org/
books/university-physics-volume-1/pages/15-introduction), Damped Oscillations (http://openstax.org/books/
university-physics-volume-1/pages/15-5-damped-oscillations) for damped harmonic motion clearly demonstrates
that the driven RLC series circuit is the electrical analog of the driven damped harmonic oscillator.
The resonant frequency of the RLC circuit is the frequency at which the amplitude of the current is a maximum
and the circuit would oscillate if not driven by a voltage source. By inspection, this corresponds to the angular
frequency at which the impedance Z in Equation 15.15 is a minimum, or when
and
15.17
This is the resonant angular frequency of the circuit. Substituting into Equation 15.9, Equation 15.10, and
Equation 15.11, we find that at resonance,
Therefore, at resonance, an RLC circuit is purely resistive, with the applied emf and current in phase.
What happens to the power at resonance? Equation 15.14 tells us how the average power transferred from an ac
generator to the RLC combination varies with frequency. In addition, reaches a maximum when Z, which
depends on the frequency, is a minimum, that is, when Thus, at resonance, the average
power output of the source in an RLC series circuit is a maximum. From Equation 15.14, this maximum is
Figure 15.18 is a typical plot of versus in the region of maximum power output. The bandwidth of the
resonance peak is defined as the range of angular frequencies over which the average power is greater than
642 15 • Alternating-Current Circuits
one-half the maximum value of The sharpness of the peak is described by a dimensionless quantity known as
the quality factor Q of the circuit. By definition,
15.18
where is the resonant angular frequency. A high Q indicates a sharp resonance peak. We can give Q in terms of
the circuit parameters as
15.19

![이미지](images/page121_img00.webp)

FIGURE 15.18 Like the current, the average power transferred from an ac generator to an RLC circuit peaks at the resonant frequency.
Resonant circuits are commonly used to pass or reject selected frequency ranges. This is done by adjusting the
value of one of the elements and hence “tuning” the circuit to a particular resonant frequency. For example, in
radios, the receiver is tuned to the desired station by adjusting the resonant frequency of its circuitry to match the
frequency of the station. If the tuning circuit has a high Q, it will have a small bandwidth, so signals from other
stations at frequencies even slightly different from the resonant frequency encounter a high impedance and are not
passed by the circuit. Cell phones work in a similar fashion, communicating with signals of around 1 GHz that are
tuned by an inductor-capacitor circuit. One of the most common applications of capacitors is their use in ac-timing
circuits, based on attaining a resonant frequency. A metal detector also uses a shift in resonance frequency in
detecting metals (Figure 15.19).
15.5 • Resonance in an AC Circuit 643

![이미지](images/page122_img00.webp)

FIGURE 15.19 When a metal detector comes near a piece of metal, the self-inductance of one of its coils changes. This causes a shift in the
resonant frequency of a circuit containing the coil. That shift is detected by the circuitry and transmitted to the diver by means of the
headphones. (credit: modification of work by Eric Lippmann, U.S. Navy)
EXAMPLE 15.4
Resonance in an RLC Series Circuit
(a) What is the resonant frequency of a circuit using the voltage and LRC values all wired in series from Example
15.2? (b) If the ac generator is set to this frequency without changing the amplitude of the output voltage, what is
the amplitude of the current?
Strategy
The resonant frequency for a RLC circuit is calculated from Equation 15.17, which comes from a balance between
the reactances of the capacitor and the inductor. Since the circuit is at resonance, the impedance is equal to the
resistor. Then, the peak current is calculated by the voltage divided by the resistance.
Solution
a. The resonant frequency is found from Equation 15.17:
b. At resonance, the impedance of the circuit is purely resistive, and the current amplitude is
Significance
If the circuit were not set to the resonant frequency, we would need the impedance of the entire circuit to calculate
the current.
644 15 • Alternating-Current Circuits
EXAMPLE 15.5
Power Transfer in an RLC Series Circuit at Resonance
(a) What is the resonant angular frequency of an RLC circuit with and
(b) If an ac source of constant amplitude 4.00 V is set to this frequency, what is the average
power transferred to the circuit? (c) Determine Q and the bandwidth of this circuit.
Strategy
The resonant angular frequency is calculated from Equation 15.17. The average power is calculated from the rms
voltage and the resistance in the circuit. The quality factor is calculated from Equation 15.19 and by knowing the
resonant frequency. The bandwidth is calculated from Equation 15.18 and by knowing the quality factor.
Solution
a. The resonant angular frequency is
b. At this frequency, the average power transferred to the circuit is a maximum. It is
c. The quality factor of the circuit is
We then find for the bandwidth
Significance
If a narrower bandwidth is desired, a lower resistance or higher inductance would help. However, a lower resistance
increases the power transferred to the circuit, which may not be desirable, depending on the maximum power that
could possibly be transferred.
CHECK YOUR UNDERSTANDING 15.6
In the circuit of Figure 15.11, and (a) What is the resonant
frequency? (b) What is the impedance of the circuit at resonance? (c) If the voltage amplitude is 10 V, what is i(t) at
resonance? (d) The frequency of the AC generator is now changed to 200 Hz. Calculate the phase difference
between the current and the emf of the generator.
CHECK YOUR UNDERSTANDING 15.7
What happens to the resonant frequency of an RLC series circuit when the following quantities are increased by a
factor of 4: (a) the capacitance, (b) the self-inductance, and (c) the resistance?
15.6 • Transformers 645
CHECK YOUR UNDERSTANDING 15.8
The resonant angular frequency of an RLC series circuit is An ac source operating at this frequency
transfers an average power of to the circuit. The resistance of the circuit is Write an
expression for the emf of the source.
15.6 Transformers
LEARNING OBJECTIVES
By the end of this section, you will be able to:
• Explain why power plants transmit electricity at high voltages and low currents and how they do this
• Develop relationships among current, voltage, and the number of windings in step-up and step-down
transformers
Although ac electric power is produced at relatively low voltages, it is sent through transmission lines at very high
voltages (as high as 500 kV). The same power can be transmitted at different voltages because power is the product
(For simplicity, we ignore the phase factor A particular power requirement can therefore be met
with a low voltage and a high current or with a high voltage and a low current. The advantage of the high-voltage/
low-current choice is that it results in lower ohmic losses in the transmission lines, which can be significant in
lines that are many kilometers long (Figure 15.20).

![이미지](images/page124_img00.webp)

FIGURE 15.20 The rms voltage from a power plant eventually needs to be stepped down from 12 kV to 240 V so that it can be safely
introduced into a home. A high-voltage transmission line allows a low current to be transmitted via a substation over long distances.
Typically, the alternating emfs produced at power plants are “stepped up” to very high voltages before being
transmitted through power lines; then, they must be “stepped down” to relatively safe values (110 or 220 V rms)
before they are introduced into homes. The device that transforms voltages from one value to another using
induction is the transformer (Figure 15.21).
646 15 • Alternating-Current Circuits

![이미지](images/page125_img00.webp)

FIGURE 15.21 Transformers are used to step down the high voltages in transmission lines to the 110 to 220 V used in homes. (credit:
modification of work by “Fortyseven”/Flickr)
As Figure 15.22 illustrates, a transformer basically consists of two separated coils, or windings, wrapped around a
soft iron core. The primary winding has loops, or turns, and is connected to an alternating voltage The
secondary winding has turns and is connected to a load resistor We assume the ideal case for which all
magnetic field lines are confined to the core so that the same magnetic flux permeates each turn of both the primary
and the secondary windings. We also neglect energy losses to magnetic hysteresis, to ohmic heating in the
windings, and to ohmic heating of the induced eddy currents in the core. A good transformer can have losses as low
as 1% of the transmitted power, so this is not a bad assumption.

![이미지](images/page125_img01.webp)

FIGURE 15.22 A step-up transformer (more turns in the secondary winding than in the primary winding). The two windings are wrapped
around a soft iron core.
To analyze the transformer circuit, we first consider the primary winding. The input voltage is equal to the
15.6 • Transformers 647
potential difference induced across the primary winding. From Faraday’s law, the induced potential difference is
where is the flux through one turn of the primary winding. Thus,
Similarly, the output voltage delivered to the load resistor must equal the potential difference induced across
the secondary winding. Since the transformer is ideal, the flux through every turn of the secondary winding is also
and
Combining the last two equations, we have
15.20
Hence, with appropriate values for the input voltage may be “stepped up” or
“stepped down” ( ) to the output voltage. This is often abbreviated as the transformer equation,
15.21
which shows that the ratio of the secondary to primary voltages in a transformer equals the ratio of the number of
turns in their windings. For a step-up transformer, which increases voltage and decreases current, this ratio is
greater than one; for a step-down transformer, which decreases voltage and increases current, this ratio is less
than one.
From the law of energy conservation, the power introduced at any instant by to the primary winding must be
equal to the power dissipated in the resistor of the secondary circuit; thus,
When combined with Equation 15.20, this gives
15.22
If the voltage is stepped up, the current is stepped down, and vice versa.
Finally, we can use , along with Equation 15.20 and Equation 15.22, to obtain
which tells us that the input voltage “sees” not a resistance but rather a resistance
Our analysis has been based on instantaneous values of voltage and current. However, the resulting equations are
not limited to instantaneous values; they hold also for maximum and rms values.
EXAMPLE 15.6
A Step-Down Transformer
A transformer on a utility pole steps the rms voltage down from 12 kV to 240 V. The transmission line resistance is
200 Ω. (a) What is the ratio of the number of secondary turns to the number of primary turns? (b) If the input current
to the transformer is 2.0 A, what is the output current? (c) Determine the power loss in the transmission line. (d)
648 15 • Alternating-Current Circuits
Find the power loss if there were no transformer and the output power were kept the same.
Strategy
The number of turns related to the voltages is found from Equation 15.20. The output current is calculated using
Equation 15.22.
Solution
a. Using Equation 15.20 with rms values and we have
so the primary winding has 50 times the number of turns in the secondary winding.
b. From Equation 15.22, the output rms current is found using the transformer equation with current
15.23
such that
c. The power loss in the transmission line is calculated to be
d. If there were no transformer, the power would have to be sent at 240 V to work for these houses, and the
power loss would be
Therefore, when power needs to be transmitted, we want to avoid power loss. Thus, lines are sent with high
voltages and low currents and adjusted with a transformer before power is sent into homes.
Significance
This application of a step-down transformer allows a home that uses 240-V outlets to have 100 A available to draw
upon. This can power many devices in the home.
CHECK YOUR UNDERSTANDING 15.9
A transformer steps the line voltage down from 110 to 9.0 V so that a current of 0.50 A can be delivered to a
doorbell. (a) What is the ratio of the number of turns in the primary and secondary windings? (b) What is the current
in the primary winding? (c) What is the resistance seen by the 110-V source?
15 • Chapter Review 649
Chapter Review
Key Terms
ac current current that fluctuates sinusoidally with the circuit is less than the theoretical maximum of
time at a fixed frequency the circuit due to voltage and current being out of
ac voltage voltage that fluctuates sinusoidally with phase
time at a fixed frequency quality factor dimensionless quantity that describes
alternating current (ac) flow of electric charge that the sharpness of the peak of the bandwidth; a high
periodically reverses direction quality factor is a sharp or narrow resonance peak
average power time average of the instantaneous resonant frequency frequency at which the
power over one cycle amplitude of the current is a maximum and the
bandwidth range of angular frequencies over which circuit would oscillate if not driven by a voltage
the average power is greater than one-half the source
maximum value of the average power rms current root mean square of the current
capacitive reactance opposition of a capacitor to a rms voltage root mean square of the voltage
change in current step-down transformer transformer that decreases
direct current (dc) flow of electric charge in only one voltage and increases current
direction step-up transformer transformer that increases
impedance ac analog to resistance in a dc circuit, voltage and decreases current
which measures the combined effect of resistance, transformer device that transforms voltages from
capacitive reactance, and inductive reactance one value to another using induction
inductive reactance opposition of an inductor to a transformer equation equation showing that the
change in current ratio of the secondary to primary voltages in a
phase angle amount by which the voltage and transformer equals the ratio of the number of turns
current are out of phase with each other in a circuit in their windings
power factor amount by which the power delivered in
Key Equations
AC voltage
AC current
capacitive reactance
rms voltage
rms current
inductive reactance
Phase angle of an RLC series circuit
AC version of Ohm’s law
Impedance of an RLC series circuit
Average power associated with a circuit element
Average power dissipated by a resistor
Resonant angular frequency of a circuit
Quality factor of a circuit
Quality factor of a circuit in terms of the circuit parameters
Transformer equation with voltage
Transformer equation with current
650 15 • Chapter Review
Summary
15.1 AC Sources the resistance, the capacitive reactance, and the
inductive reactance.
• Direct current (dc) refers to systems in which the
source voltage is constant. 15.4 Power in an AC Circuit
• Alternating current (ac) refers to systems in
• The average ac power is found by multiplying the
which the source voltage varies periodically,
rms values of current and voltage.
particularly sinusoidally.
• Ohm’s law for the rms ac is found by dividing the
• The voltage source of an ac system puts out a
rms voltage by the impedance.
voltage that is calculated from the time, the peak
• In an ac circuit, there is a phase angle between
voltage, and the angular frequency.
the source voltage and the current, which can be
• In a simple circuit, the current is found by
found by dividing the resistance by the
dividing the voltage by the resistance. An ac
impedance.
current is calculated using the peak current
• The average power delivered to an RLC circuit is
(determined by dividing the peak voltage by the
affected by the phase angle.
resistance), the angular frequency, and the time.
• The power factor ranges from –1 to 1.
15.2 Simple AC Circuits
15.5 Resonance in an AC Circuit
• For resistors, the current through and the voltage
• At the resonant frequency, inductive reactance
across are in phase.
equals capacitive reactance.
• For capacitors, we find that when a sinusoidal
• The average power versus angular frequency plot
voltage is applied to a capacitor, the voltage
for a RLC circuit has a peak located at the
follows the current by one-fourth of a cycle.
resonant frequency; the sharpness or width of
Since a capacitor can stop current when fully
the peak is known as the bandwidth.
charged, it limits current and offers another form
• The bandwidth is related to a dimensionless
of ac resistance, called capacitive reactance,
quantity called the quality factor. A high quality
which has units of ohms.
factor value is a sharp or narrow peak.
• For inductors in ac circuits, we find that when a
sinusoidal voltage is applied to an inductor, the 15.6 Transformers
voltage leads the current by one-fourth of a
• Power plants transmit high voltages at low
cycle.
currents to achieve lower ohmic losses in their
• The opposition of an inductor to a change in
many kilometers of transmission lines.
current is expressed as a type of ac reactance.
• Transformers use induction to transform voltages
This inductive reactance, which has units of
from one value to another.
ohms, varies with the frequency of the ac source.
• For a transformer, the voltages across the
15.3 RLC Series Circuits with AC primary and secondary coils, or windings, are
related by the transformer equation.
• An RLC series circuit is a resistor, capacitor, and
• The currents in the primary and secondary
inductor series combination across an ac source.
windings are related by the number of primary
• The same current flows through each element of
and secondary loops, or turns, in the windings of
an RLC series circuit at all points in time.
the transformer.
• The counterpart of resistance in a dc circuit is
• A step-up transformer increases voltage and
impedance, which measures the combined effect
decreases current, whereas a step-down
of resistors, capacitors, and inductors. The
transformer decreases voltage and increases
maximum current is defined by the ac version of
current.
Ohm’s law.
• Impedance has units of ohms and is found using
Conceptual Questions
15.1 AC Sources 15.2 Simple AC Circuits
1 . What is the relationship between frequency and 2 . Explain why at high frequencies a capacitor acts
angular frequency? as an ac short, whereas an inductor acts as an
15 • Chapter Review 651
open circuit. refers to the maximum average power
dissipated in the resistor. How does this
15.3 RLC Series Circuits with AC
compare with the maximum instantaneous

| 3 .15.4 P | In an RLC series cmeasured acrossthe voltage of thequestion for the vower in an AC Cir |
| --- | --- |
| 4 .5 .6 .7 .8 .Probl | For what value ofvoltage output ofthe average powemaximum?Discuss the differand instantaneouThe average ac cuzero. Despite this,circuit. Explain.Can the instantansource ever be neoutput be negativThe power ratingemsC SourcesWrite an expressioac source that hasfrequency of 200imple AC Circuits |
| 15.1 A14 .15.2 S | Write an expression ac source that has frequency of 200 Simple AC Circuits |

rcuit, can the voltage power dissipated in the resistor?
he capacitor be greater than
15.6 Transformers
ource? Answer the same
ltage across the inductor. 9 . Why do transmission lines operate at very high
voltages while household circuits operate at
cuit
fairly small voltages?
he phase angle between the
10 . How can you distinguish the primary winding
n ac source and the current is
from the secondary winding in a step-up
output of the source a
transformer?
11 . Battery packs in some electronic devices are
nces between average power
charged using an adapter connected to a wall
power.
socket. Speculate as to the purpose of the
rrent delivered to a circuit is adapter.
power is dissipated in the
12 . Will a transformer work if the input is a dc
voltage?
ous power output of an ac
13 . Why are the primary and secondary coils of a
ative? Can the average power
transformer wrapped around the same closed
?
loop of iron?
f a resistor used in ac circuits
22 . A capacitor is connected to an emf given
by . (a) What is the
n for the output voltage of an
reactance of the capacitor? (b) Write an
an amplitude of 12 V and a
expression for the current output of the source.
z.
23 . A 100-mH inductor is connected across the emf
of the preceding problem. (a) What is the
15 . Calculate the reactance of a capacitor at reactance of the inductor? (b) Write an
(a) 60 Hz, (b) 600 Hz, and (c) 6000 Hz. expression for the current through the inductor.
16 . What is the capacitance of a capacitor whose 15.3 RLC Series Circuits with AC
reactance is at 60 Hz?
24 . What is the impedance of a series combination
17 . Calculate the reactance of a 5.0-mH inductor at of a resistor, a capacitor, and a
(a) 60 Hz, (b) 600 Hz, and (c) 6000 Hz. capacitor at a frequency of 2.0 kHz?
18 . What is the self-inductance of a coil whose 25 . A resistor and capacitor are connected in series
reactance is at 60 Hz? across an ac generator. The emf of the generator
is given by where
19 . At what frequency is the reactance of a
, and .
capacitor equal to that of a 10-mH inductor?
(a) What is the impedance of the circuit? (b)
20 . At 1000 Hz, the reactance of a 5.0-mH inductor What is the amplitude of the current through the
is equal to the reactance of a particular resistor? (c) Write an expression for the current
capacitor. What is the capacitance of the through the resistor. (d) Write expressions
capacitor? representing the voltages across the resistor and
across the capacitor.
21 . A resistor is connected across the emf
. Write an 26 . A resistor and inductor are connected in series
expression for the current through the resistor. across an ac generator. The emf of the generator
652 15 • Chapter Review
is given by where given by where
and also, and and when connected across (a)
(a) What is the impedance of the a capacitor, (b) a 20-mH inductor, and (c)
circuit? (b) What is the amplitude of the current a resistor.
through the resistor? (c) Write an expression for
32 . A 40-mH inductor is connected to a 60-Hz AC
the current through the resistor. (d) Write
source whose voltage amplitude is 50 V. If an AC
expressions representing the voltages across
voltmeter is placed across the inductor, what
the resistor and across the inductor.
does it read?
27 . In an RLC series circuit, the voltage amplitude
33 . For an RLC series circuit, the voltage amplitude
and frequency of the source are 100 V and 500
and frequency of the source are 100 V and 500
Hz, respectively, an
Hz, respectively; ; and .
and (a) What is the impedance of
Find the average power dissipated in the resistor
the circuit? (b) What is the amplitude of the
for the following values for the capacitance: (a)
current from the source? (c) If the emf of the
and (b)
source is given by ,
how does the current vary with time? (d) Repeat 34 . An ac source of voltage amplitude 10 V delivers
the calculations with C changed to electric energy at a rate of 0.80 W when its
current output is 2.5 A. What is the phase angle
28 . An RLC series circuit with ,
between the emf and the current?
and is driven by an
ac source whose frequency and voltage 35 . An RLC series circuit has an impedance of
amplitude are 500 Hz and 50 V, respectively. (a) and a power factor of 0.50, with the voltage
What is the impedance of the circuit? (b) What is lagging the current. (a) Should a capacitor or an
the amplitude of the current in the circuit? (c) inductor be placed in series with the elements to
What is the phase angle between the emf of the raise the power factor of the circuit? (b) What is
source and the current? the value of the reactance across the inductor
that will raise the power factor to unity?
29 . For the circuit shown below, what are (a) the
total impedance and (b) the phase angle 15.5 Resonance in an AC Circuit

| (a) Calculate tan RLC series,to whafrequency?The resonantiscircuit is 5.0circuit?(a) What is thseries circuit? (circuit at resoFor an RLC se | he resonantcircuit for whandt happens tofrequency ofIf the selmH, what is te resonant frwithb) What is thnance?ries circuit,andable frequent frequency ihe resistor?ircuit?of voltage amency f drives |
| --- | --- |

between the current and the emf? (c) Write an
36 . ngular frequency of
expression for
ich ,

![이미지](images/page131_img00.webp)

(b) If R is changed
the resonant angular
37 . an RLC series circuit
-inductance in the
e capacitance in the
38 . quency of an RLC
, , and
impedance of the
15.4 Power in an AC Circuit 39 . ,
(a) If an ac
30 . The emf of an ac source is given by
y is connected to the
where and
s maximum power
Calculate the average power
b) What is the quality
output of the source if it is connected across (a)
a capacitor, (b) a 20-mH inductor, and (c)
a resistor. 40 . plitude 100 V and
an RLC series circuit
31 . Calculate the rms currents for an ac source is
with , , and (a)
15 • Chapter Review 653
Plot the current through the resistor as a turns in the primary winding, how many turns
function of the frequency f. (b) Use the plot to are there in the secondary winding? (b) If a
determine the resonant frequency of the circuit. resistor connected across the secondary winding
draws an rms current of 0.75 A, what is the
41 . (a) What is the resonant frequency of a resistor,
current in the primary winding?
capacitor, and inductor connected in series if
, and ? (b) If 45 . A step-up transformer connected to a 110-V line
this combination is connected to a 100-V source is used to supply a hydrogen-gas discharge tube
operating at the resonant frequency, what is the with 5.0 kV (rms). The tube dissipates 75 W of
power output of the source? (c) What is the Q of power. (a) What is the ratio of the number of
the circuit? (d) What is the bandwidth of the turns in the secondary winding to the number of
circuit? turns in the primary winding? (b) What are the
rms currents in the primary and secondary
42 . Suppose a coil has a self-inductance of 20.0 H
windings? (c) What is the effective resistance
and a resistance of . What (a) capacitance
seen by the 110-V source?
and (b) resistance must be connected in series
with the coil to produce a circuit that has a 46 . An ac source of emf delivers 5.0 mW of power at
resonant frequency of 100 Hz and a Q of 10? an rms current of 2.0 mA when it is connected to
the primary coil of a transformer. The rms
43 . An ac generator is connected to a device whose
voltage across the secondary coil is 20 V. (a)
internal circuits are not known. We only know
What are the voltage across the primary coil and
current and voltage outside the device, as shown
the current through the secondary coil? (b) What
below. Based on the information given, what can
is the ratio of secondary to primary turns for the
you infer about the electrical nature of the
transformer?
device and its power usage?
47 . A transformer is used to step down 110 V from a

![이미지](images/page132_img00.webp)

wall socket to 9.0 V for a radio. (a) If the primary
winding has 500 turns, how many turns does the
secondary winding have? (b) If the radio
operates at a current of 500 mA, what is the
current through the primary winding?
48 . A transformer is used to supply a 12-V model
train with power from a 110-V wall plug. The
train operates at 50 W of power. (a) What is the
rms current in the secondary coil of the
15.6 Transformers transformer? (b) What is the rms current in the
primary coil? (c) What is the ratio of the number
44 . A step-up transformer is designed so that the
of primary to secondary turns? (d) What is the
output of its secondary winding is 2000 V (rms)
resistance of the train? (e) What is the resistance
when the primary winding is connected to a
seen by the 110-V source?
110-V (rms) line voltage. (a) If there are 100
Additional Problems
49 . The emf of an ac source is given by (b) If the frequency is changed to 60 Hz while
where and keeping the voltage amplitude at 160 V, what
Find an expression that are the capacitive reactance and the current
represents the output current of the source if it amplitude?
is connected across (a) a capacitor, (b) a
51 . A 20-mH inductor is connected across an AC
20-mH inductor, and (c) a resistor.
source with a variable frequency and a constant-
50 . A 700-pF capacitor is connected across an ac voltage amplitude of 9.0 V. (a) Determine the
source with a voltage amplitude of 160 V and a reactance of the circuit and the maximum
frequency of 20 kHz. (a) Determine the current through the inductor when the frequency
capacitive reactance of the capacitor and the is set at 20 kHz. (b) Do the same calculations for
amplitude of the output current of the source. a frequency of 60 Hz.
654 15 • Chapter Review
52 . A capacitor is connected across a 60-Hz 56 . An ac source of voltage amplitude 100 V and
ac source whose voltage amplitude is 50 V. (a) frequency 1.0 kHz drives an RLC series circuit
What is the maximum charge on the capacitor? with , , and . (a)
(b) What is the maximum current into the Determine the rms current through the circuit.
capacitor? (c) What is the phase relationship (b) What are the rms voltages across the three
between the capacitor charge and the current in elements? (c) What is the phase angle between
the circuit? the emf and the current? (d) What is the power
output of the source? (e) What is the power
53 . A 7.0-mH inductor is connected across a 60-Hz
dissipated in the resistor?
ac source whose voltage amplitude is 50 V. (a)
What is the maximum current through the 57 . In an RLC series circuit, , ,
inductor? (b) What is the phase relationship , and . What
between the current through and the potential is the power output of the source?
difference across the inductor?
58 . A power plant generator produces 100 A at 15
54 . What is the impedance of an RLC series circuit at kV (rms). A transformer is used to step up the
the resonant frequency? transmission line voltage to 150 kV (rms). (a)
What is rms current in the transmission line? (b)
55 . What is the resistance R in the circuit shown
If the resistance per unit length of the line is
below if the amplitude of the ac through the
what is the power loss per
inductor is 4.24 A?
meter in the line? (c) What would the power loss

![이미지](images/page133_img00.webp)

per meter be if the line voltage were 15 kV
(rms)?
59 . Consider a power plant located 25 km outside a
town delivering 50 MW of power to the town.
The transmission lines are made of aluminum
cables with a cross-sectional area. Find
the loss of power in the transmission lines if it is
transmitted at (a) 200 kV (rms) and (b) 120 V
(rms).
60 . Neon signs require 12-kV for their operation. A
transformer is to be used to change the voltage
from 220-V (rms) ac to 12-kV (rms) ac. What
must the ratio be of turns in the secondary
winding to the turns in the primary winding? (b)
What is the maximum rms current the neon
lamps can draw if the fuse in the primary
winding goes off at 0.5 A? (c) How much power
is used by the neon sign when it is drawing the
maximum current allowed by the fuse in the
primary winding?
Challenge Problems
61 . The 335-kV ac electricity from a power connected in series, as shown below, across a
transmission line is fed into the primary winding 120-V (rms) ac power source oscillating at
of a transformer. The ratio of the number of 60-Hz frequency. (a) Find the current in the
turns in the secondary winding to the number in circuit. (b) Find the voltage drops across the
the primary winding is . (a) What resistor and inductor. (c) Find the impedance of
voltage is induced in the secondary winding? (b) the circuit. (d) Find the power dissipated in the
What is unreasonable about this result? (c) resistor. (e) Find the power dissipated in the
Which assumption or premise is responsible? inductor. (f) Find the power produced by the
source.
62 . A resistor and 30-mH inductor are
15 • Chapter Review 655
Use the simplified circuit shown below.

![이미지](images/page134_img00.webp)

![이미지](images/page134_img01.webp)

63 . A resistor, capacitor, and 30-mH
inductor are connected in series with an ac 67 . Show that the SI unit for capacitive reactance is
source of amplitude 10 V and frequency 125 Hz. the ohm. Show that the SI unit for inductive
(a) What is the impedance of the circuit? (b) reactance is also the ohm.
What is the amplitude of the current in the
68 . A coil with a self-inductance of 16 mH and a
circuit? (c) What is the phase constant of the
resistance of is connected to an ac source
current? Is it leading or lagging the source
whose frequency can be varied. At what
voltage? (d) Write voltage drops across the
frequency will the voltage across the coil lead
resistor, capacitor, and inductor and the source
the current through the coil by
voltage as a function of time. (e) What is the
power factor of the circuit? (f) How much energy 69 . An RLC series circuit consists of a resistor,
is used by the resistor in 2.5 s? a capacitor, and a 120-mH inductor
whose coil has a resistance of . The source
64 . A resistor, capacitor, and 2.5-H
for the circuit has an rms emf of 240 V at a
inductor are connected in series with an ac
frequency of 60 Hz. Calculate the rms voltages
source of amplitude 10 V and variable angular
across the (a) resistor, (b) capacitor, and (c)
frequency . (a) What is the value of the
inductor.
resonance frequency ? (b) What is the
amplitude of the current if ? (c) What is 70 . An RLC series circuit consists of a resistor,
the phase constant of the current when an capacitor, and a 50-mH inductor. A
? Is it leading or lagging the source 110-V (rms) source of variable frequency is
voltage, or is it in phase? (d) Write an equation connected across the combination. What is the
for the voltage drop across the resistor as a power output of the source when its frequency is
function of time when . (e) What is the set to one-half the resonant frequency of the
power factor of the circuit when ? (f) circuit?
How much energy is used up by the resistor in
71 . Shown below are two circuits that act as crude
2.5 s when ?
high-pass filters. The input voltage to the circuits
65 . Find the reactances of the following capacitors is , and the output voltage is (a) Show
and inductors in ac circuits with the given that for the capacitor circuit,
frequencies in each case: (a) 2-mH inductor with
a frequency 60-Hz of the ac circuit; (b) 2-mH
inductor with a frequency 600-Hz of the ac and for the inductor circuit,
circuit; (c) 20-mH inductor with a frequency
6-Hz of the ac circuit; (d) 20-mH inductor with a
(b) Show that for high frequencies,
frequency 60-Hz of the ac circuit; (e) 2-mF
but for low frequencies,
capacitor with a frequency 60-Hz of the ac
circuit; and (f) 2-mF capacitor with a frequency
600-Hz of the AC circuit.
66 . An output impedance of an audio amplifier has an
impedance of and has a mismatch with a low-
impedance loudspeaker. You are asked to insert
an appropriate transformer to match the
impedances. What turns ratio will you use, and why?
656 15 • Chapter Review
and for the inductor circuit,

![이미지](images/page135_img00.webp)

(b) Show that for low frequencies,
but for high frequencies,

![이미지](images/page135_img01.webp)

72 . The two circuits shown below act as crude low-
pass filters. The input voltage to the circuits is
, and the output voltage is (a) Show that
for the capacitor circuit,
