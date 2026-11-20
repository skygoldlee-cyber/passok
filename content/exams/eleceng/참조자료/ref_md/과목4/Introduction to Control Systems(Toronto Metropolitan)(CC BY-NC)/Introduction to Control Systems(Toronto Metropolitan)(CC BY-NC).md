# Introduction to Control Systems(Toronto Metropolitan)(CC BY-NC)

> 원문: Malgorzata Zywno, *Introduction to Control Systems* — https://pressbooks.library.torontomu.ca/controlsystems/ · CC BY-NC · Toronto Metropolitan University


Introduction to Control Systems
Introduction to Control Systems
With Multimedia Tutorials and Examples
MALGORZATA ZYWNO
RYERSON UNIVERSITY
TORONTO
Introduction to Control Systems by Malgorzata Zywno is licensed under a Creative Commons Attribution-NonCommercial 4.0
International License, except where otherwise noted.
Contents
Introduction 1
Acknowledgements 2
Foreword 3
Preface 4
Chapter 1
1.1 Definitions: System and Control 6
1.2 Types of Control Actions 7
1.3 Control Objectives 15
1.4 Laplace Transforms 17
1.5 Transfer Function Representations of Simple Physical Systems 25
1.6 Basic Block Diagrams 32
Chapter 2
2.1 General Definition of Stability 35
2.2 Locations in s-Plane vs. Time Response 36
2.3 Stability in s-Domain: The Routh-Hurwitz Criterion of Stability 37
2.4 Determining Stable Range for Proportional Controller Operations 43
2.5 Relative Stability - Gain Margin 47
2.6 Examples 48
Chapter 3
3.1 Basic Block Diagrams Continued 56
3.2 Signal Flow Graphs 61
3.3 Examples 67
Chapter 4
4.1 Introduction 81
4.2 Standard Time Inputs 82
4.3 Step response specifications - Definitions 84
4.4 Examples 87
Chapter 5
5.1 Equivalent Unit Feedback Loop 90
5.2 Steady State Error Analysis in an Equivalent Unit Feedback Loop 92
5.3 Examples 97
Chapter 6
6.1 First order systems 107
6.2 Second Order Overdamped Systems 109
Chapter 7
7.1 Second Order Underdamped Systems 112
7.2 Response Specifications for the Second Order Underdamped System 116
7.3 Examples 124
Chapter 8
8.1 Systems with Delay 141
8.2 Minimum Realizations and Reduced Order Models - Part 1 143
8.3 Dominant System Dynamics and Reduced Order Models - Part 2 146
8.4 The Effect of an Additional Pole on the 2nd Order System Response 149
8.5 The Effect of an additional Zero on the 2nd Order System Response 155
8.6 The Effect of a Non-Minimum Phase Zero on the 2nd Order System Response 160
8.7 Examples 167
Chapter 9
9.1 Introduction 195
9.2 Proportional Control 202
9.3 Proportional + Derivative Control 206
9.4 Proportional + Integral Control 212
9.5 PID Controller and Its Tuning 219
9.6 Effect of PID Controller Modes on System Stability 224
9.7 Examples 225
Chapter 10
10.1 Introduction 228
10.2 Evans' Root Locus Construction Rules - Introduction 230
10.3 Evans Root Locus Construction Rule # 1: Beginning, End and Symmetry 233
10.4 Evans Root Locus Construction Rule # 2: Segments of Root Locus on Real Axis 234
10.5 Evans Root Locus Construction Rule # 3: Asymptotic Angles and Centroid 236
10.6 Evans Root Locus Construction Rule # 4:Break-Away and Break-In Points 239
10.7 Evans Root Locus Construction Rule # 5: Crossover with Imaginary Axis 240
10.8 Evans Root Locus Construction Rule #6: Angles of Departures/Arrivals at Complex Poles/Zeros 243
10.9 Examples 244
Chapter 11
11.1 Gain Margin from Bode Plot 255
11.2 Definition of Phase Margin 259
11.3 Examples 260
Chapter 12
12.1 Model from Closed Loop Frequency Response 277
12.2 Model from Open Loop Frequency Response 285
12.3 Summary 288
12.4 Examples 290
Chapter 13
13.1 Basic Rules - Summary 302
13.2 Lead Controller 307
13.3 Lead Controller Design – Solved Examples 312
13.4 Lag Controller 337
13.5 Lag Controller Design – Solved Example 1 341
13.6 Lead - Lag Controller 358
13.7 Examples 362
Chapter 14
14.1 Why We Need Another Criterion of Stability 378
14.2 Polar Plots Revisited 379
14.3 Solved Examples for Polar Plots 381
14.4 Gain and Phase Margins vs. Polar Plots 388
14.5 Concept of Mapping 393
14.6 Cauchy's Mapping Theorem 398
14.7 Solved Examples of Nyquist Stability Criterion 402
Appendix 414
A system is a collection of objects arranged in an orderly fashion, which is goal-oriented. The system is also
referred to as the plant, or process. Examples of systems – industrial robot, car, power turbine, induction furnace,
motor, but also human body, corporation, and traffic flow. Systems differ from objects (such as tools) in that
they have a certain level of complexity and a power source.
Control is used whenever some quantity, such as temperature, altitude or speed, must be made to behave in
some desirable way over time. For example, control methods are used to make sure that the temperature in our
homes stays within acceptable levels in both winter and summer; so that airplanes maintain desired heading,
speed and altitude; and so that automobile emissions meet specifications.
1 | Introduction
Acknowledgements
Acknowledgements | 2
Foreword
3 | Foreword
Preface
Consider a closed loop control system working in a unit feedback configuration under Proportional Control,
where the process transfer function is described as follows:
Part 1. Sketch the root locus plot and calculate all relevant coordinates, such as the crossovers through the
Imaginary Axis, the break-away, the centroid and the asymptotic angles.
Part 2. Determine the value of the Operational Gain ( ) such that the closed loop step response will have
a Percent Overshoot of 5%. For the computed value of the Operational Gain, , answer these questions: 1)
What will be the steady state error, in %, of the closed loop step response? 2) What will be the Settling Time,
of the closed loop step response? 3) What will be the system Gain Margin?
Preface | 4
CHAPTER 1
5 | Chapter 1
1.1 Definitions: System and Control
A system is a collection of objects arranged in an orderly fashion, which is goal-oriented. The system is also
referred to as the plant, or process. Examples of systems – industrial robot, car, power turbine, induction furnace,
motor, but also human body, corporation, and traffic flow. Systems differ from objects (such as tools) in that
they have a certain level of complexity and a power source.
Control is used whenever some quantity, such as temperature, altitude or speed, must be made to behave in
some desirable way over time. For example, control methods are used to make sure that the temperature in our
homes stays within acceptable levels in both winter and summer; so that airplanes maintain desired heading,
speed and altitude; and so that automobile emissions meet specifications.
1.1 Definitions: System and Control | 6
1.2 Types of Control Actions
Note that examples shown here are from Online Control Systems Tutorials (accessible from a Ryerson DMP
website at: http://ryecast.ryerson.ca/flashcom/applications/controlsys/) that provide illustrations and
visualization of basic concepts of Control through streamed video, animations and interactive, self-scoring
quizzes.

![이미지](images/page013_img00.webp)

Figure 1-1: Online Tutorials
1.2.1 Basic Concepts of Feedback
Diagram below represents basic feedback loop configuration that we will be studying in this course. See more
introductory information in the Tutorials online in the section on Basic Introduction to Control Systems.
7 | 1.2 Types of Control Actions

![이미지](images/page014_img00.webp)

Figure 1-2: Diagram showing feedback
Question: In common sense of the word, positive feedback is good, negative feedback is bad. Would that work
for a control system? If yes, why? If no, why? Give examples of positive and negative feedback in real life systems.
1.2.2 Math of the Basic Feedback Loop
Consider the basic negative feedback loop in Figure 1‑3. Derive the Input-Output relationship for this loop,
describing the closed loop gain of this system:

![이미지](images/page014_img01.webp)

Figure 1-3: Basic Negative Feedback Loop
HINT: Consider these basic blocks and the equations they represent.
1.2 Types of Control Actions | 8

![이미지](images/page015_img00.webp)

1.2.3 Positive Feedback
Positive feedback leads to instability. Example – putting a powered mike in front of a speaker.

![이미지](images/page015_img01.webp)

Figure 1-4: Positive Feedback Loop
1.2.4 Open Loop Control – No Disturbance Present
Consider an example in the Tutorials online in the section on Basic Introduction to Control Systems – car driving
with no feedback. Let us look at two cases:
• No disturbance – flat road
• Disturbance – road grade
Case # 1 – No Disturbance Present
9 | 1.2 Types of Control Actions

![이미지](images/page016_img00.webp)

Figure 1-5: Open Loop Control Example

![이미지](images/page016_img01.webp)

Figure 1-6: Open Loop Control
Examples of a Simple Open Loop Control:
• Lights On/Lights Off
• Toaster
• Electric Screwdriver
• Programmable Logic Controller
1.2 Types of Control Actions | 10
1.2.5 Open Loop Control – Disturbance Present
Case # 2 – Disturbance Present
Imagine now driving a car at an intended constant speed (e.g. 100 km/hr) – to achieve that, you press the gas
pedal up to a certain throttle opening. Suddenly the road grade changes – a disturbance occurs. If driven with
the same throttle opening, the car will slow down. Conclusion – Open Loop Control cannot handle uncertainty
(disturbance).

![이미지](images/page017_img00.webp)

Figure 1-7: Disturbance in Open Loop Control System
11 | 1.2 Types of Control Actions

![이미지](images/page018_img01.webp)

Figure 1‑8 Open Loop Control in Presence of Disturbance
1.2.6 Closed Loop Control

![이미지](images/page018_img00.webp)

Figure 1‑9 Closed Loop Control Example
Feedback (Closed Loop) Control can handle uncertainty (both disturbance and parameter drift).
1.2 Types of Control Actions | 12

![이미지](images/page019_img00.webp)

Figure 1‑10 Closed Loop Control in Presence of Disturbance
Feedback reduces System Error (i.e. difference between Reference and Output) and can minimize the effect
Disturbance has on the Output – this action is referred to as Disturbance Rejection.
Examples of Closed Loop Control:
• Human Only: walking, sweating (temperature regulation), skateboarding etc.
• Human-in-the-Loop: driving a car (or any other vehicle), adjusting temperature of water in the shower;
manual adjustment of settings for a device (e.g. valve, furnace, etc.)
• Automatic Feedback: thermostat heater, any industrial or non-industrial autonomous robot, cruise control
in a car, “smart” prosthetics (biofeedback), Dean Kamen’s wheel-chair that can climb stairs; gap control in
mag-lev (magnetic levitation) system in super-fast trains, balancing of a Segway device, etc.
Systems can have Human-in-the-Loop and Automatic Control at the same time. Example: operating the
Segway – at one level, automatic control system makes sure that the device is balanced in an upright position,
on another level, human operator makes control decisions about direction and speed of travel.
1.2.7 Summary
Open Loop Control:
• OK in predictable environments & uncomplicated tasks
• Limitation: Vulnerable to unpredictability (Disturbance)
• Result: Errors occur
Closed Loop Control:
13 | 1.2 Types of Control Actions
• Robust performance – excellent handling of unpredictability (Disturbance);
• Result: Error reduced or eliminated;
• Limitation: complexity & cost; instability may occur
Differences:
• Open Loop – no attempt to verify the outcome, no feedback, no correction
• Closed Loop – outcome assessed, feedback provided, corrective action taken
Similarities:
• Both have power source and a certain level of complexity
• Both perform useful tasks.
1.2 Types of Control Actions | 14
1.3 Control Objectives
• Implicit objective and First Priority: no damage, safety considerations – i.e.
• Once the system is stable, then what?
• Explicit objectives:
◦ Tracking
▪ In steady state
▪ In transient state
◦ Disturbance Rejection.
Tracking: The objective is to force the process output to follow, or track, a desired reference signal. We will
concentrate on Steady State Tracking of steps, ramps, and slowly time varying signals as well as on Transient
Tracking – we will focus on one particular type of response – Step (i.e. response to a step reference), because of
its discontinuity. It is a very harsh input to a system and all dynamic limitations of the system will be laid bare by
it.
Special case of Tracking – REGULATION: the reference signal is constant (can be zero). Control objective focuses
on maintaining Steady State, regardless of possible Disturbance and/or Parameter Shift.
Disturbance Rejection: The objective is to make sure that the process output follows, or tracks, a desired
reference signal, despite of any unwanted additional inputs, i.e. disturbances.
Question: What is noise, as opposed to disturbance? Can you give examples of noise in context of control
systems?
1.3.1 Control Methodology
Control objectives must be achieved within:
• Established measures of system performance
• Practical limitations imposed by the equipment
15 | 1.3 Control Objectives

![이미지](images/page022_img00.webp)

Figure 1‑11 Methodology of Control
1.3 Control Objectives | 16
1.4 Laplace Transforms
Self-Study: Review your ELE532 Notes and other resources. You can also refer to the review material on the
course website.
1.4.1 Definitions
Equation 1‑1
1.4.1.1 Final Value Theorem
Equation 1‑2
1.4.1.2 Initial Value Theorem
Equation 1‑3
1.4.1.3 Properties of Laplace transforms
Table 1‑1 Properties of Laplace Transform
1.4.2 Solving for System Response
Parametric models cannot be developed without math. Laws of physics describe dynamic linear, time invariant
(LTI) systems using ordinary differential equations. To simplify their analysis, Laplace transform is used. Consider
a certain LTI (Linear Time Invariant), SISO (Single Input Single Output) system:
17 | 1.4 Laplace Transforms

![이미지](images/page024_img00.webp)

Let the input – output relationship for the system be described by a following nth order differential equation:
Equation 1‑4
The equation parameters relate to physical aspects of the system. Time domain description of systems is
not convenient for quick paper-and-pencil speculations. To simplify math, Classical Control uses a Laplace
Transform system description, which converts the differential equations into their algebraic equivalents in the
s-domain. The solution for y(t) can then be found using inverse Laplace transformation to Y(s).
1.4.3 Two Transfer Functions Models: TF and ZPK
In the transform domain the input-output relationship of the system is defined by a transfer function G(s),
defined as a ratio of the Laplace transform of the system output signal y(t), to the Laplace transform of the
system input signal u(t), with any initial conditions in the system set to zero. The system transfer function G(s)
can be thought of as a dynamic gain of the system:

![이미지](images/page024_img01.webp)

Block diagrams are used to graphically represent systems and their components, as shown above. In order to
find G(s), a Laplace transform of the system differential equation in Equation 1‑4 is taken:
Equation 1‑5
Transfer functions are ratios of polynomials written in terms of the s-operator. The resulting function in Equation
1‑5 is a ratio of two polynomials, N(s) and D(s):
Equation 1‑6
Roots of the numerator polynomial of G(s) in Equation 1‑6 are called system zeros, , and roots of the
denominator polynomial are called system poles, .
1.4 Laplace Transforms | 18

| MATLAB Enabled |
| --- |
| Note that in MATLAB a transfer function object in a polynomial form can be created by using the “tf” command. Forexample, consider a following transfer function in the polynomial ratio form: |

![이미지](images/page025_img00.webp)

![이미지](images/page025_img01.webp)

The same transfer function can be represented in the so-called ZPK form (factorized form):
Equation 1‑7
K is a multiplier. It is important to see the difference between K and Kdc, which denotes the DC gain of the
system (i.e. s=0):
Equation 1‑8
Our transfer function can be factorized and the multiplier gain K is equal to 2:
The DC gain of our transfer function is:
19 | 1.4 Laplace Transforms
In MATLAB the transfer function can be shown in a factorized form by using the “zpk” command, and the DC
gain can be found using “dcgain” command:

![이미지](images/page026_img01.webp)

| In MATLAB the “zpk” command can be used to create a transfer function object in a ZPK form, and “tf”command to convert it to a polynomial form. |
| --- |

![이미지](images/page026_img00.webp)

![이미지](images/page026_img02.webp)

Locations of the system poles and zeros can be presented graphically as the so-called Pole-Zero Map.
1.4.4 Partial Fractions Technique
If a certain control system is described by a transfer function G(s), the system response can be found as
. Since Laplace Transform Tables do not provide exhaustive solutions, a technique of a
Partial Fractions Expansion is used to find inverse Laplace Transforms for various time functions – see a table of
basic Laplace – Time Domain Function pair shown in Table 1‑2.
1.4 Laplace Transforms | 20
1.4.4.1 Residues – Distinct Roots Case
Equation 1‑9
Equation 1‑10
1.4.4.2 Residues – Multiple Roots Case
This is the case for Laplace Transforms with multiple powers of some roots. Assume multiplicity of m for root :
Equation 1‑11
Residues for distinct roots calculated as before:
Equation 1‑12
To calculate residues for a multiple root, multiply both sides of Equation 1‑12 by and substitute the
value of the root :
Equation 1‑13
To calculate the residues for the second multiplicity of the root :
Equation 1‑14
21 | 1.4 Laplace Transforms

| Laplace Transform | Time Domain Function |
| --- | --- |

To calculate the residues for the remaining multiplicities of the root r1, use this recursive formula:
Equation 1‑15
1.4.5 Examples
1.4.5.1 Example
Consider a system described by the following transfer function and find the pole-zero model of the transfer
function and its DC gain.
HINT: Use MATLAB software to check your results in this, and the remaining examples in this section.
1.4 Laplace Transforms | 22
1.4.5.2 Example
Consider a system described by the following transfer function:

![이미지](images/page029_img00.webp)

Find the pole-zero model of the transfer function and its DC gain. HINT: Use Matlab.
1.4.5.3 Example
A certain LTI system is described as having one zero and four poles, as follows:
,
,
,
,
,
It is also recorded that the system has a DC gain of 5.
Write the complete transfer function of the system in a ZPK form.
1.4.5.4 Example
Consider a system described by the following transfer function:
Create an LTI object representing this system using both the transfer function model and the zero-pole-gain
model. Extract zero-pole-gain data and numerator-denominator from the LTI object. Obtain the system dc gain
and the pole-zero map of the transfer function. Obtain a minimum realization of this system. Use MATLAB to
solve this problem.
1.4.5.5 Example
Consider a system described by the following transfer function:
Find an analytical expression for an impulse response of the system.
23 | 1.4 Laplace Transforms
1.4.5.6 Example
A certain control system is described by the following transfer function:
Find an analytical expression for a step response of the system.
1.4.5.7 Example
A certain control system is described by the following closed loop transfer function:
Find an analytical expression for a step response of the system – note the integrator term in the denominator!
1.4.5.8 Example
A certain control system is described by the following closed loop transfer function:
One of the closed loop poles is at -5. Find an analytical expression for a step response of the system.
1.4 Laplace Transforms | 24
1.5 Transfer Function Representations of
Simple Physical Systems
1.5.1 Electrical Systems
Modeling of electrical systems is based on:
• Ohm’s Law
• Kirchhoff’s Current Law (KCL)
• Kirchhoff’s Voltage Law (KVL)
Table 1‑3: Basic Equations for Electric Circuits

![이미지](images/page031_img00.webp)

Energy dissipated through
resistance as heat.

![이미지](images/page031_img01.webp)

Energy stored in the magnetic
field. No instantaneous
change in current.

![이미지](images/page031_img02.webp)

Energy stored in the
electrostatic field. No
instantaneous changes in
voltage.
1.5.2 Mechanical Systems
Modeling of mechanical translational systems is based on:
• Newton’s First Law
• Newton’s Second Law
• Free Body Diagrams.
• In the Table below, we have: -force, – translational displacement, – velocity, -acceleration
Table 1‑4: Basic Equations for Mechanical Translational Systems

![이미지](images/page031_img03.webp)

Energy dissipated through viscous
damping as heat

![이미지](images/page031_img04.webp)

Energy stored as kinetic-potential

![이미지](images/page031_img05.webp)

Energy stored as kinetic-potential
25 | 1.5 Transfer Function Representations of Simple Physical
Systems
1.5.3 Mechanical Rotational Systems
Modeling of mechanical rotational systems is based on:
• Newton’s First Law
• Newton’s Second Law
• Free Body Diagrams.
• In the Table below, we have: – torque, – angular velocity, – angular displacement, -angular
acceleration
Table 1‑5: Basic Equations for Mechanical Roatational Systems

![이미지](images/page032_img00.webp)

Viscous friction represents a retarding
force that dissipates energy as heat

![이미지](images/page032_img01.webp)

Torsional spring – represents
compliance of shaft when subject to
torque, stores potential energy of
rotational motion

![이미지](images/page032_img02.webp)

Inertia – property of an element that
stores the kinetic energy of rotational
motion
1.5.4 Model of Armature Controlled DC Motor
NOTE: This example will help you with your Lab Project # 3.
DC motor is a common actuator in control systems. It directly provides rotary motion and, coupled with wheels
or a rack-and-pinion mechanism, can provide transitional motion. The picture to the left in Figure 1‑12 shows a
large industrial DC motor; in control systems applications you’re more likely to see a small, lightweight, high-
precision geared DC motor, like the one shown on the right. However, their system equations follow the same
laws of physics.
The diagram in Figure 1‑13 is a representation of the DC armature controlled motor, showing the electric circuit
of the armature as well as mechanical parts of the motor, including gears. Small DC motors, such as the one
driving the Servo Module in the lab, work most efficiently at high speeds, and therefore they have to be geared
for most applications. Direct drives are found in some DC motors with large ratings. Motor equations are shown
in Table 1‑6.
In the equations, R and L represent the resistance and inductance of the armature winding, represent
the torque constant and the CEMF constant, respectively, n is the gear ratio and represent the
equivalent inertia and viscous friction coefficients of the motor and load combined, as reflected onto the motor
side of the gear. Based on the above equations, a block diagram of the DC motor can be built, and is shown in
Figure 1‑14.
1.5 Transfer Function Representations of Simple Physical Systems | 26

![이미지](images/page033_img00.webp)

Figure 1-12: Examples of DC Motors

|  | Armateur Winding:Counter-electromotive (CEMF) force: |
| --- | --- |
|  | Energy Conversion: |

![이미지](images/page033_img01.webp)

![이미지](images/page033_img02.webp)

Table 1‑6: Basic Equations for the DC Motor

![이미지](images/page033_img03.webp)

The DC motor transfer function, , defined as the dynamic ratio of the load position output signal and
the armature voltage input signal, is next derived from the above blocks, as shown below:
27 | 1.5 Transfer Function Representations of Simple Physical Systems
Equation 1‑16

![이미지](images/page034_img00.webp)

Figure 1-13: DC Armature Controlled Motor

![이미지](images/page034_img01.webp)

Figure 1-14: Block Diagram of the DC Motor
This is a 3rd order transfer function. For small inductances L (or, L/R << J/B), this can be simplified:
Equation 1‑17
Motor dynamics can now be approximated by a 2nd order transfer function. Two motor parameters are defined:
, called the motor gain constant, and , called the motor time constant.
,
Equation 1‑18
The motor transfer function can be written as:
1.5 Transfer Function Representations of Simple Physical Systems | 28
Equation 1‑19
The block diagram of motor representation shown in Figure 1‑14 can now be simplified to the one in Figure 1‑15:

![이미지](images/page035_img00.webp)

Figure 1-15: Simplified Block Representation of the Motor
How accurate is this approximation? Closed loop responses of the accurate servo module model and the model
using a 2nd order approximation for the DC motor are shown in Figure 1‑16 – the responses are practically
identical.

![이미지](images/page035_img01.webp)

Figure 1-16: DC Motor Responses – Accurate (3rd order) vs. Approximate (2nd order)
1.5.5 Examples
1.5.5.1 Example
Consider a 2nd order filter, with a schematic as shown below:
29 | 1.5 Transfer Function Representations of Simple Physical Systems

![이미지](images/page036_img00.webp)

Find the transfer function for this filter, if is an input to the system and is an output and the component
values are and . What kind of filter is this?
1.5.5.2 Example
Consider a mechanical system shown in the following diagram. Derive the transfer function of this system with
Force as an input signal and linear displacement as an output signal. Use MATLAB to simulate system responses
for values of mass M = 1, spring flexibility K = 2 and friction B adjustable. Assume the force input to be in a form
of an impulse or a very short pulse. Also check the “Mass & Spring” animation/simulation in Matlab Demos.

![이미지](images/page036_img01.webp)

1.5.5.3 Example
Consider the electric circuit below. Find its mechanical analog.

![이미지](images/page036_img02.webp)

1.5 Transfer Function Representations of Simple Physical Systems | 30
1.5.5.4 Example
Consider an electric circuit, a two-port, shown below, where its components have the following values:
and

![이미지](images/page037_img00.webp)

Find the transfer function of the two-port, . Next, find an analytical expression for the two-port
step response, .
31 | 1.5 Transfer Function Representations of Simple Physical Systems
1.6 Basic Block Diagrams
1.6.1 Blocks in Series
Consider two cascade blocks as shown in Figure 1‑17. What is the transfer function relating signals and
?

![이미지](images/page038_img00.webp)

Figure 1-17 Blocks in Series
,
1.6.2 Blocks in Parallel
Consider two blocks in parallel as shown in Figure 1‑18. What is the transfer function relating signals and
?

![이미지](images/page038_img01.webp)

Figure 1-18 Blocks in Parallel
1.6 Basic Block Diagrams | 32
1.6.3 Basic Closed Loop Revisited
Consider the basic closed loop system identical to the one shown in Chapter 1.2.2, but this time with the static
block gains replaced by their dynamic equivalents, i.e. their transfer functions describing a relationship of time
domain signals as represented in Laplace Transform domain. Let us derive the closed loop transfer function
relating system output to the reference.

![이미지](images/page039_img00.webp)

Figure 1-19 Basic Closed Loop
Equation 1‑20
Closed loop characteristic equation is then described as follows:
Equation 1‑21
33 | 1.6 Basic Block Diagrams
CHAPTER 2
Chapter 2 | 34
2.1 General Definition of Stability
Stability is an implicitly stated control objective. Intuitively, a closed loop system is stable if it does not “blow up”.
For introduction, see Online Tutorials – sections on Basic Concepts and on Stability.
Recall from ELE532 that mathematically, stability is related to the location of the closed loop system transfer
function poles.
Definition: A system is stable in BIBO sense if, for every bounded input, the output remains bounded.
Consider now the transfer function of a basic closed loop system:
Equation 2-1
,
Characteristic equation of the closed loop system is:
Equation 2‑2
Equation 2‑3
Definition:
Suppose that the closed loop system has a transfer function . The system is stable if, and only if, the poles
of shown in Equation 2‑3 have strictly negative real parts: .
To determine this condition analytically (as opposed to a numerical solution, such as provided by MATLAB) a
Criterion of Stability needs to be defined – it will be the Routh-Hurwitz Criterion of Stability.
35 | 2.1 General Definition of Stability
2.2 Locations in s-Plane vs. Time
Response
Figure 2‑1 below shows three possible s-Plane locations for a pair of complex conjugate poles. Recall that the
pair of complex conjugate poles results in oscillatory time response, where the Real part of the pole determines
the decay rate of the response, while the Imaginary part of the pole determines the frequency of oscillations.

![이미지](images/page042_img00.webp)

Figure 2-1 Pole Locations vs. Time response
The first panel of Figure 2‑1 illustrates a stable response, the second panel illustrates an unstable response, and
the third panel illustrates a marginally stable response. The system respective behaviours will be labeled as
“Stable”, “Unstable” and “Marginally Stable”. Because we have the pair of complex conjugate poles, the second,
“Unstable”, case results in an oscillatory instability.
Note that these three behaviours can also be applied to a case where the system pole(s) are real. Real poles
result in transient(s) of exponential form. When , we will have a combination of exponential
decays, when we will have a constant (step) response, and when , we will have an
exponentially increasing (but of single polarity, not oscillating) unstable response. Thus this case is referred to
as monotonic instability. Refer to Online Tutorials for more on System Stability.
2.2 Locations in s-Plane vs. Time Response | 36
2.3 Stability in s-Domain: The
Routh-Hurwitz Criterion of Stability
The original Criterion was formulated in a paper published in 1877 by Edward Routh, English mathematician
born in Upper Canada (now Quebec). In 1895 German mathematician Adolf Hurwitz formulated the Criterion
in its today’s form, based on theory of polynomials. This is why the Criterion bears both their names.
2.3.1 Necessary Condition for Stability
Definition:
The Necessary Condition for Stability requires that all coefficients of the Characteristic Equation polynomial are present
and have the same sign.
In practice, it means that they should all be positive, as negative signs would correspond to a negative Controller
gain. A control system with a negative gain is not practical as it would do exactly the opposite to the Command
(Reference) input.
Where does the Necessary Condition come from? Consider the following. Once the Characteristic Equation is
factorized into a ZPK form, it will consist of two types of factors, 1st and 2nd order, as shown. If the roots of these
factors are in the LHP (i.e. the Stable Region of the s-plane), then the resulting coefficients in these factors will
be positive:
– stable factors
For example and are factors corresponding to stable pole locations (-5 and -1.5+j3.43,
-1.5-j3.43, respectively), while , are factors corresponding to unstable pole locations (+5
and +1.5+j3.43, +1.5-j3.43 respectively). Also note that one of the two poles corresponding to the
factor is unstable (poles are: -5.53,+2.53).
Conclusion 1:
If only stable factors are present in Equation 2‑4, after multiplication, the polynomial form of the characteristic equation
will have all powers of s terms present and all coefficients will be positive. There is no possibility of having a negative sign
or of a term cancellation resulting in a missing power of s, since all factor signs were positive.
Conclusion 2:
Any negative signs or any terms that are missing indicate presence of a factor or factors describing unstable pole
location(s).
37 | 2.3 Stability in s-Domain: The Routh-Hurwitz Criterion of
Stability
Example
Roots are: 1.43+ j1.19, 1.43- j1.19, -0.86 (conjugate pair unstable)
However, the fact that a characteristic polynomial passes the Necessary Condition test is not a guarantee that
the system is stable.
Example
Consider the example where all coefficients are present and positive and the system is still unstable:
Roots are: -2, 0.5 + j1.94, 0.5 – j1.94 (conjugate pair unstable).
2.3.2 Sufficient Condition for Stability – Routh Array
An array is built following a pattern shown next in Table 2‑1. Note this is a rule that is not derived, as the original
Routh derivation is quite complex, and involves arcane aspects of the Theory of Polynomials.

![이미지](images/page044_img00.webp)

Table 2‑1 Routh Array
Routh-Hurwitz Criterion of Stability:
The system is stable if and only if all coefficients in the first column of a complete Routh Array are of the same sign. The
number of sign changes indicates the number of unstable poles. Note that in practice this means that all the signs in the
first column have to be positive – see the note above on the negative gain.
2.3 Stability in s-Domain: The Routh-Hurwitz Criterion of Stability | 38
Example
Let’s apply this Criterion to a specific case. Consider a control system where the Characteristic Equation
, determined by the denominator of its transfer function, is as follows:
The necessary condition here is fulfilled – all coefficients are positive and all powers of s are present. To check
the sufficient condition we need to build the Routh Array, as shown next.

![이미지](images/page045_img01.webp)

Next we apply the Routh-Hurwitz Criterion – all coefficients in the first column of the Array (shaded) are positive,
hence the system is stable.
A quick check with MATLAB (“roots” command) shows that indeed the system has no unstable poles:

![이미지](images/page045_img00.webp)

![이미지](images/page045_img02.webp)

2.3.3 Special Case of Routh Array – Auxiliary Equation
Consider now the following example:
39 | 2.3 Stability in s-Domain: The Routh-Hurwitz Criterion of Stability
We have a bit of a problem here – the Routh Array terminates prematurely – a row of zeros makes it impossible
to complete the Array.

![이미지](images/page046_img00.webp)

The row of zeros indicates that some of the roots of the characteristic equations are placed on the Imaginary
Axis (case of Marginal Stability). Define Auxiliary Equation as an equation with coefficients from the Array row
immediately above the row of zeros:
Roots of Auxiliary Equations describe the system poles on Imaginary axis:
Routh has proven that we can use the coefficients of a derivative of the auxiliary equation to complete the
Routh Array:
The fifth row, which was a row of zeros in the original Routh Array, is now replaced by:

![이미지](images/page046_img01.webp)

The complete Routh Array is now as follows:
2.3 Stability in s-Domain: The Routh-Hurwitz Criterion of Stability | 40

![이미지](images/page047_img00.webp)

In this particular case looking at the first column we can observe two sign changes (from +1 to -20 and from -20
to +21). This indicates that a) the system is unstable, and b) that it has two unstable poles (in RHP – the Right-
Hand Part of the S-Plane).
A quick check with MATLAB (“roots” command) shows that
indeed the system has two unstable poles:

![이미지](images/page047_img01.webp)

Two unstable poles:
Also observe the two poles on the Imaginary
Axis are: , as calculated from the Auxilliary
Equation.
Auxiliary Equation is an extremely important concept because it enables us to determine stable ranges of
Proportional Gains that can be safely used in a closed loop system.
NOTE – for one possible application of the Auxilliary Equation, refer to your Lab # 1.
2.3.4 Examples
2.3.4.1 Example
Use the Routh-Hurwitz Criterion of Stability on a system with the following Characteristic Equation :
2.3.4.2 Example
Use the Routh-Hurwitz Criterion of Stability on a system with the following Characteristic Equation :
41 | 2.3 Stability in s-Domain: The Routh-Hurwitz Criterion of Stability
2.3 Stability in s-Domain: The Routh-Hurwitz Criterion of Stability | 42
2.4 Determining Stable Range for
Proportional Controller Operations
Consider a closed loop system under Proportional Control in Figure 2‑2:

![이미지](images/page049_img00.webp)

Figure 2-2 Non-unit Feedback Closed Loop System under Proportional Control
The closed loop transfer function and the system Characteristic Equation are:
Equation 2‑5
The variable parameter – the Proportional Controller Gain, , is now a part of the system Characteristic Equation
and will feature in the Routh Array. This allows us to define the required condition for a stable, safe, range of
Controller operations.
Example
Consider the following control system:
43 | 2.4 Determining Stable Range for Proportional Controller
Operations

![이미지](images/page050_img00.webp)

• Is this system open-loop stable?
• Determine a range of gains K required for a stable operation of this closed loop system.
Solution:
Part 1: Open Loop
Open loop characteristic equation is:

![이미지](images/page050_img01.webp)

The system is open-loop stable, based on the Routh-Hurwitz Stability Criterion. We can also find numerically
(MATLAB), what the poles of the open system are: -5.45 +j2.68, -5.45 – j2.68, -0.11.
The system Open Loop Transfer Function components are:
Part 2: Closed Loop
The system Closed Loop Transfer Function is:
Apply the Routh-Hurwitz criterion to the closed loop characteristic equation:
The Necessary Condition is:
2.4 Determining Stable Range for Proportional Controller Operations | 44
The Sufficient Conditions from Routh Array:

![이미지](images/page051_img00.webp)

The resulting conditions are:
The total condition is:

![이미지](images/page051_img01.webp)

Note that the practical range of stable controller operations, as opposed to the previous purely mathematical
condition, is remember that we do not want to run systems with a negative gain!
Extreme values of the determined range are called Critical Gain values. Again, of practical interest is only the
upper, positive Critical gain value. What happens when the Controller gain reaches that Critical gain value?
When :

![이미지](images/page051_img02.webp)

45 | 2.4 Determining Stable Range for Proportional Controller Operations
As the pole-zero map illustrates, the location of marginally stable poles on the Imaginary axis corresponds to
the frequency of sustained oscillations, \ . This corresponds to the period of oscillations
equal to 1.02 seconds. Step response of the system when is also shown.

![이미지](images/page052_img00.webp)

![이미지](images/page052_img01.webp)

2.4 Determining Stable Range for Proportional Controller Operations | 46
2.5 Relative Stability - Gain Margin
In the previous section we considered the system stability and introduced the Routh-Hurwitz Stability Criterion.
The Criterion can give us the answer regarding the so-called Absolute Stability, i.e. is the system Stable or
Unstable. Stability relates to the poles location – if any of the closed loop system poles is in the RHP, the system
is unstable. The Criterion can also define a range of gains for a stable system operation. The upper limit of the
stability range, i.e. the maximum gain computed from the Routh Array, is called a Critical Gain, . The
controller gain at which the system operates is called the Operational Gain, . The closer is to its critical
value, the more oscillatory the response, the longer it takes to settle and the system is closer to becoming
unstable. The measure of how “close” that is, is called Relative Stability.
Discussing Relative Stability is particularly relevant when system parameters are not well-identified. Let’s say
based on the calculations for the system parameters the resulting poles are very close to the Imaginary Axis,
yet still in the LHP. The answer to the Absolute Stability question is YES, the system is stable. Yet, due to
uncertainties in the parameters, closed loop pole locations are not exactly known and it is possible that one or
more poles are already in the RHP making the system unstable. If we have a measure of Relative Stability, we
have a warning sign that the closed system poles are dangerously close to the Imaginary Axis and therefore the
system is dangerously close to becoming unstable.
We will therefore define a measure of Relative Stability and will call it a Gain Margin:
Equation 2-6
The larger the Gain Margin, the further away inside the LHP the system poles are. Note that excessively large
Gain Margins mean that is very low, which may have negative impact on the quality of the transient system
response – recall Lab Projects – low gain is associated with a sluggish, slow and overdamped response (large
settling and rise times), and with large errors. This dilemma describes limitations of Proportional Control – larger
gains speed up the response and improve steady state errors (good), but also lead to oscillations, reduction in
relative Stability, and eventually to Instability (bad).
Gain Margin becomes an additional system specification ensuring good relative Stability. We will hear
more about it in a context of frequency response design, and we will define its measure using Bode plots.
Because gains on frequency plots are traditionally described in decibels, it is customary to define Gain margin
as either a non-dimentional ratio (referred to as volts per volts or V/V), or in logarithmic units, dB.
Based on Equation 2‑6 we have:
If , the system is
in V/V units in dB units
stable:
If , the system is
in V/V units in dB units
marginally stable:
If , the system is
in V/V units in dB units
unstable:
Typically the requirement for Gain Margin is that it should be at least 6 dB, or 2 V/V.
47 | 2.5 Relative Stability - Gain Margin
2.6 Examples
2.6.1 Example
Consider a closed loop system as shown. Determine the range of stable operations for the Proportional
Controller with the gain K.

![이미지](images/page054_img00.webp)

2.6.2 Example
Consider the block diagram shown below, describing a process under the so-called Proportional-Integral-
Derivative (PID) Control, as shown in the following Figure. Is the system open loop stable? Justify your answer.
Next, let the Integral Gain and use the Routh-Hurwitz criterion to find the range of Derivative Gains
and Proportional Gains in terms of , so that the closed loop stability is achieved.

![이미지](images/page054_img01.webp)

2.6.3 Example
Consider the block diagram shown below and simplify it to find first the open loop, then the closed loop system
transfer function as a function of gain K. Is the open loop system stable? Next, establish the range of gains K for
a stable closed loop operation of this system. Find the critical value of the gain, at which the system would be
marginally stable, and the corresponding frequency of oscillations of the marginally stable response, .
2.6 Examples | 48

![이미지](images/page055_img00.webp)

2.6.4 Example
Consider a unit feedback system under Proportional Control, as shown:

![이미지](images/page055_img01.webp)

Apply the Routh-Hurwitz stability criterion to this system and determine the critical value(s) of gain, , for
system stability, as well as the frequency of oscillations, , resulting when .
Next, assuming that the operational values of the proportional gain are again, and ,
compute the corresponding values of the Gain Margins.
2.6.5 Example
Part 1: Consider the SIMULINK diagram representing a certain closed loop system under Proportional Control:
49 | 2.6 Examples

![이미지](images/page056_img00.webp)

When the gain value is as indicated in the diagram, the “Scope” graph is as shown on the next page. What is
the frequency of oscillations of the system response, ?
Part 2: Assume that the constant Proportional Gain block (Slider Gain) in the SIMULINK diagram is replaced
with a variable Proportional Gain K, and use theory you have learned to find the range of the Proportional Gain
values for the stable system operation. Determine the critical value of the Proportional Gain, , for which
the system becomes marginally stable – how does it compare with the information provided by SIMULINK?

![이미지](images/page056_img01.webp)

Assuming that the operational gain of the system , what is the system Gain Margin? Repeat for
.
2.6.6 Example
Consider four control systems, each with a characteristic equation as shown below. Which system is stable?
System 1:
System 2:
System 3:
System 4:
2.6 Examples | 50
2.6.7 Example
Consider the following closed loop control system under the so-called Proportional Control (P), where the
system parameters are as follows: .

![이미지](images/page057_img00.webp)

Find the closed loop transfer function of this system in terms of the Proportional Controller gain, . Find the
condition for the gain so that the closed loop operation of the system is stable, and determine the practical
range of values for the stable closed loop operation of the system.
What is the critical value of the Proportional Controller gain, , that will cause the closed loop system to be
marginally stable? When the gain is set at this critical value, , what will the resulting frequency of
oscillations, , be (in radians/sec)?
2.6.8 Example
Consider the following closed loop control system under the so-called Proportional Integral Control (P I), where
the system parameters are the same as in Example 2.6.7: .

![이미지](images/page057_img01.webp)

Find the closed loop transfer function of this system in terms of both Proportional and Integral Controller gains,
and . Find the condition in terms of gains and so that the closed loop operation of the system is
stable, and determine the practical range of each gain, and required for the stable closed loop operation
of the system;
Now, assume the proportional Controller gain value is ; what is the range for the Integral Controller
gain, , for the stable closed loop operation of the system? What is the critical value of the Integral Controller
gain, , that will cause the closed loop system to be marginally stable? When the Integral Controller Gain
51 | 2.6 Examples
is set at this critical value, , what will the resulting frequency of oscillations, , be (in radians/
sec)?
2.6.9 Example
Consider the following closed loop control system under Proportional Control:

![이미지](images/page058_img00.webp)

Find the closed loop transfer function of this system in terms of its Proportional Gain K. Find the practical range
of Controller Gain values such that the closed loop operation of the system is stable. What is the critical value
of the Proportional Gain, , that will cause the closed loop system to be marginally stable? When the
Controller Gain is set at its critical value, , what will be the resulting frequency of oscillations, ,
(in radians/sec)? What will be the period of these oscillations, ?
2.6.10 Example
Consider the following closed loop control system under the so-called Proportional Integral Control (P+I):

![이미지](images/page058_img01.webp)

Find the closed loop transfer function of this system in terms of both Proportional and Integral Controller gains,
and . Next, find the conditions in terms of gains and so that the closed loop operation of the
system is stable, and determine the range of each gain, and , required for such stable closed loop
operation of the system.
Next, assume the Integral Controller gain value is . Answer the following questions:
2.6 Examples | 52
What is the range for the Proportional Controller gain, for the stable closed loop operation of the system?
What is the critical value of the Proportional Controller gain, , that will cause the closed loop system to be
marginally stable? When the Proportional Controller Gain is set at this critical value, , what will be
the resulting period of oscillations, , in seconds?
Finally, assume the Integral Controller gain value is and the Proportional Controller gain,
. Answer the following questions:
Will the response be stable? What will be the steady state value of a response to a unit reference? Is this a good
Proportional Controller Gain value to operate the system with? If yes, briefly explain why. If not, briefly explain
why.
2.6.11 Example
Consider the servo-control system for a position control of one of the joints of a robot arm, operating under
Proportional Control (controller gain ), as shown in the following Figure. is the reference angular
position signal, is the actual angular output shaft position signal, is the armature voltage, is motor
torque and is shaft velocity. This control system utilizes an armature-controlled DC motor, with an analog
rotary position sensor.
The systems parameters are as follows: – transducer gain of the sensor, – amplifier
gain, – motor torque constant, – armature resistance, – armature
inductance, – CEMF constant, – motor & load (robot arm) inertia, and
is the motor & load linear friction coefficient.

![이미지](images/page059_img00.webp)

Find the closed loop transfer function between reference angle and the load position angle . Next, find
the critical value of the controller gain, , such that the closed loop system is marginally stable. Find
the corresponding value of the resulting oscillations, , in rad/sec. Next, determine the practical range (or
ranges) of the controller gain , for a stable operation of the closed loop system.
53 | 2.6 Examples
2.6.12 Example
Consider a unit feedback system under Proportional Control, . The process transfer function is
described as follows:
What is the critical gain, , at which the system will be marginally stable? What is the frequency of
oscillations, , at that gain?
2.6.13 Example
Consider a unit feedback system under Proportional Control, as shown:

![이미지](images/page060_img00.webp)

Find the closed loop transfer function of this system with as its parameter and determine the system
characteristic equation. Determine the range of values of the Proportional Gain so that the system response
remains stable, and the critical value of the gain, , for which the system becomes marginally stable. What
is the frequency of oscillations, , of the system response when the system becomes marginally stable?
2.6.14 Example
Consider a unit feedback system operating under Proportional Control (Controller Gain is , where the
process transfer function is described as follows:
Find the closed loop transfer function of this system and the critical value (or values) of the controller gain,
, such that the closed loop system is marginally stable. Find the corresponding value (or values) of the
resulting oscillations, , in rad/sec. Next, determine the practical range (or ranges) of the controller gain,
, for a stable operation of the closed loop system.
2.6 Examples | 54
CHAPTER 3
55 | Chapter 3
3.1 Basic Block Diagrams Continued
Recall the Basic Block Diagram operations from Chapter 1.6: blocks in series, blocks in parallel, and a basic closed
loop. These simple rules of Block Diagram simplifications are not always sufficient. For example, consider the
block diagram below:

![이미지](images/page062_img00.webp)

Figure 3-1: Block Diagram Reduction Example
In order to calculate the system transfer function, , we need to look at some other rules, as
follows.
3.1.1 Moving the Summer in Front of a Block
Consider the segment of the block diagram in Figure 3‑1 , shown in Figure 3‑2. It cannot be “collapsed” using
the closed loop formula, or a series of blocks formula, or a parallel blocks formula. Pay attention to the signal
in a blue frame. The feedback signal connects to the “inner summer” where it is added to the signal
. The signal in the blue frame is an output of the “inner summer”, and therefore it is equal to. The signal
in the blue frame is an output of the “inner summer”, and therefore it is equal to .
Consider now the same segment of the block diagram, but with a small modification as shown in Figure
3‑3. The “inner summer” is moved in front of block – to maintain the signal equivalency, the feedback
signal is now fed through block . Note how the signal travels (red arrows) around the
feedback loop and finally is fed through block – on the output of that block it is added to signal and
thus the signal in the box is still equal to . The equivalency of signals has been maintained.
However, unlike the diagram above, its equivalent below can be now easily be “collapsed”: blocks and
can be replaced by their product, next the feedback loop formula can be applied to them with as feedback,
the result can be put in series with block and finally the feedback loop formula can be applied, with
as feedback.
3.1 Basic Block Diagrams Continued | 56

![이미지](images/page063_img00.webp)

Figure 3-2: Moving the Summer in Front of the Block Part 1

![이미지](images/page063_img01.webp)

Figure 3-3: Moving the Summer in Front of the Block Part 2
Note that if a summer were to be moved behind the block, the additional gain would be equal the value of the
block gain, instead of its inverse.
3.1.2 Moving the Take-off Point Behind a Block
Consider the same segment of the block diagram in our example, and focus on the signal , as shown in
Figure 3‑4. Again, any adjustment must maintain the signal equivalency. Pay attention to the output of block
– signal – it is also the signal entering block . Consider now the same segment of the block diagram,
with a small modification, as shown in Figure 3‑5.
57 | 3.1 Basic Block Diagrams Continued

![이미지](images/page064_img00.webp)

Figure 3-4: Moving the Take-off Point Behind the Block Part 1

![이미지](images/page064_img01.webp)

Figure 3-5: Moving the Take-off Point Behind the Block Part 2
The take-off point is moved behind block and at the same time a block is placed in the path of output
signal . As a result, the signal being fed to block is still equal to . At this point it is easy
to see that blocks and can be replaced by their product, and then the feedback formula applied with
as feedback, the result is put in series with block and again, the feedback formula can be applied, with
in feedback. Thus the whole diagram can be successfully “collapsed”. Note that if a take-off point were
to be moved in front of the block, the additional gain would be equal the value of the block gain, instead of its
inverse.
3.1.3 Summary
Moving the Summer behind the Block:
3.1 Basic Block Diagrams Continued | 58

![이미지](images/page065_img00.webp)

![이미지](images/page065_img01.webp)

Moving the Summer in front of the Block:

![이미지](images/page065_img03.webp)

![이미지](images/page065_img02.webp)

Moving the Take-off Point behind the Block:

![이미지](images/page065_img05.webp)

![이미지](images/page065_img04.webp)

Moving the Take-off Point in front of the Block:

![이미지](images/page065_img06.webp)

![이미지](images/page065_img07.webp)

59 | 3.1 Basic Block Diagrams Continued
3.1.2 Example of Block Diagram
Let’s now go back to our example, shown in Figure 3‑1. Moving the take-off point behind the block, as shown in
Figure 3‑5 results in a diagram configuration that can be easily “collapsed” using series and closed loop formula:
3.1 Basic Block Diagrams Continued | 60
3.2 Signal Flow Graphs
3.2.1 Introduction
We have just demonstrated that transfer functions of systems represented by block diagrams can be found
by applying the rules of block diagram algebra and their reduction. A simpler approach, referred to as “Signal
Flow Graphs” will be now introduced. Theory of flow graphs follows theory of solutions of sets of algebraic
simultaneous equations – both the block diagrams and signal flow graphs are graphical representations of
algebraic equations. In 1953 Samuel J. Mason (1921-1974), working at M.I.T., published a paper in which he stated
the gain formula now used to determine transfer functions from signal flow graphs.
Mason’s Gain formula is basically a short-hand representation of the Cramer’s Rule that is used to solve sets
of algebraic equations. Block diagrams consist of blocks, summers, take-off points and signals with arrows
indicating a direction of a signal flow. Signal flow graphs are much more succinct and only include nodes for
signals and branches for gains. Any signals entering a node are assumed to be added or subtracted, as indicated
by the polarity of the branch gain – thus for the incoming signals the node acts as a summer. Any signal leaving
the node is assumed to carry the value of the signal represented by that node – thus the node also acts as a
take-off point, for all outgoing signals. Figure 3‑6 shows basic equivalencies between a block diagram and a
signal flow graph. Using these basic definitions, the block diagram shown in Figure 3‑1 can be re-drawn as a
signal flow graph shown in Figure 3‑7.
61 | 3.2 Signal Flow Graphs

![이미지](images/page068_img00.webp)

Figure 3-6: Basic definitions for Signal Flow Graphs.

![이미지](images/page068_img01.webp)

Figure 3-7: Equivalent Signal Flow Graph
3.2 Signal Flow Graphs | 62
3.2.2 Introduction
Consider again the block diagram example shown in Figure 3‑1, where we want to calculate the I/O relationship,
the transfer function . An alternative to a tedious block diagram reduction is to consider
algebraic equations that are represented by this block diagram, and to apply the Cramer’s rule of solving sets of
simultaneous algebraic equations. Recall that the Cramer’s Rule is as follows:

![이미지](images/page069_img00.webp)

Equation 3‑1

![이미지](images/page069_img01.webp)

![이미지](images/page069_img02.webp)

Equation 3‑2
In Equation 3‑2, is defined as the Main Determinant of the set of linear equations shown in Equation 3‑1, and
is defined as a co-factor of the variable . Algebraic equations describing the block diagram in Figure 3‑1,
or its equivalent signal flow graph in Figure 3‑7, can be written up as:
They can be re-written in a matrix form as:
63 | 3.2 Signal Flow Graphs

![이미지](images/page070_img00.webp)

The solution for the output signal, Y, can be then found, according to Equation 3‑2.

![이미지](images/page070_img01.webp)

Equation 3‑3
In Equation 3‑3, the Main Determinant of the equation set, and also of the system represented by the block
diagram, can be found, following the rules of matrix algebra:

![이미지](images/page070_img02.webp)

Similarly, the Co-factor for variable Y can be found as:
3.2 Signal Flow Graphs | 64

![이미지](images/page071_img00.webp)

Finally, the transfer function of the system can be found:
This is of course identical with the solution derived through the block diagram reduction. What follows is called
the Mason’s Gain formula, and it is a short-hand notation of the Cramer’s Rule result. The Mason’s Gain formula
defines a few simple to follow rules that allow us to write the transfer function of the system by inspection,
without going through solving the algebraic equations describing the signal flow (or block diagram).
3.2.3 Mason’s Gain Formula
The Mason’s gain formula is written as:
Equation 3‑4
where is the Main Determinant of the system described by a signal flow graph. The system characteristic
equation is then . The Main Determinant is defined as:
Equation 3‑5
Note that the Main determinant always starts with a 1, and the signs in front of all the remaining terms follow a
checker-board pattern, starting with a negative sign (i.e., -, +, -, +, etc.)
Other terms appearing in the formula are defined as forward paths and their Co-factors , and loops .
A Loop is defined as any closed signal path within the signal flow graph, as long as none of the loop components
(neither a node nor a branch) is traversed twice.
– this expression corresponds to a sum of all loops in the signal flow;
– this expression corresponds to a sum of products of all non-touching loops taken two at a time;
– this expression corresponds to a sum of products of all non-touching loops taken three at a
time, etc., etc…..
65 | 3.2 Signal Flow Graphs
– this expression corresponds to a path in the signal flow, defined as any way through the signal flow graph
from the input to the output which does not go through any nodes or branches twice.
– this expression corresponds to a cofactor of a given path – it is created from the main determinant by
dropping from it all expressions containing loops touching the given path.
When the Mason’s gain formula is applied to the signal flow graph from our example in Figure 3‑7, the result is
as follows:
Of course, this result is identical with the ones obtained before, through block diagram reduction, and through
Cramer’s Rule.
3.2 Signal Flow Graphs | 66
3.3 Examples
3.3.1 Example
Consider a system described by the signal flow graph as shown below. Find its transfer function,
, using the Mason’s Gain formula.

![이미지](images/page073_img00.webp)

![이미지](images/page073_img01.webp)

3.3.2 Example
Consider a system described by the signal flow graph as shown below. Find its transfer function, ,
using the Mason’s Gain formula.

![이미지](images/page073_img02.webp)

3.3.3 Example
Consider the transfer function shown and sketch a signal flow graph to represent it.
67 | 3.3 Examples
3.3.4 Example
Consider another similar example and find a signal flow graph representation for G(s) as shown, and sketch a
signal flow graph to represent it.
3.3.5 Example
Consider the signal flow graph below. Apply the Mason’s Gain formula to obtain its transfer function. This is a
difficult example. Expect 11 loops and 7 paths in the signal flow graph. Try to keep your loops and paths in an
organized way – the suggestion is to number the nodes, and write out the loops and the paths using the node
numbers.

![이미지](images/page074_img00.webp)

3.3.6 Example
Consider the signal flow graph below representing a system with two inputs. Apply the Mason’s Gain formula to
determine both the system transfer function, here referred to as and the disturbance transfer
function, which is referred t as .

![이미지](images/page074_img01.webp)

3.3 Examples | 68

![이미지](images/page075_img01.webp)

3.3.7 Example
Consider the signal flow graph below. Find the transfer function of the system. What is the system order? What
is the system DC gain? What is the system high frequency gain? What kind of a filter would that be?

![이미지](images/page075_img02.webp)

3.3.8 Example
Consider the signal flow graph shown. Complete the Table below, then find the system transfer function
.

![이미지](images/page075_img00.webp)

69 | 3.3 Examples

![이미지](images/page076_img00.webp)

3.3.9 Example
Consider the signal flow graph shown. Complete the Table below, then find the system transfer function
, write out the system characteristic equation and check if is stable.

![이미지](images/page076_img01.webp)

3.3.10 Example
Consider a signal flow graph as shown. Find the closed loop system transfer function. Show all loop and path
gains, calculations for the cofactors, the main determinant of the signal flow graph, and the final transfer
function of the system both in the polynomial ratio (TF) form, as well as in the pole-zero-gain (ZPK) form.
Compute the analytical system response to a unit step input.
3.3 Examples | 70

![이미지](images/page077_img00.webp)

3.3.11 Example
Consider again the servo-control system for a position control of the robot joint from Example 2.6.11, shown in
Figure 2‑3. We found its transfer function using simple block diagram reduction. Now, do it using the Mason’s
Gain formula.
3.3.12 Example
Consider yet again the servo-control system for a position control of the robot joint from Example 2.6.11, but now
modified to allow for modeling of a disturbance and shown in Figure 3‑8. Find the transfer function between
the disturbance torque and the output load angle :

![이미지](images/page077_img01.webp)

Figure 3-8: Block Diagram of the Robot Joint Positioning System, with Disturbance
71 | 3.3 Examples
3.3.13 Example
Now let’s consider a speed-control servomotor system under Proportional Control, as shown in the next
figure, which is a variation on the previous servo-control configuration. Here, is the reference angular
velocity signal, is the actual angular velocity signal, and is a torque disturbance. This analog
control system utilizes the same armature-controlled DC motor, but with a speed pickup arranged through a
tachometer . The remaining systems parameters are as in the previous servo-control examples:
– amplifier gain, – motor torque constant, – armature resistance,
– armature inductance, – CEMF constant, – motor & load inertia,
and – motor & load linear friction coefficient.
Set the Proportional Gain K = 1, and use the Mason’s Gain formula to derive the closed loop system transfer
function and the disturbance transfer function and write an expression
for the system output, i.e. the angular velocity.

![이미지](images/page078_img00.webp)

Figure 3-9: Block Diagram of the Robot Joint Positioning System, with Disturbance
3.3.14 Example
Consider two systems represented by two SIMULINK diagrams shown. Identify the important difference
between the two of them, and show how it will affect the Mason’s Gain formula used to find transfer functions
of the two systems. Find both transfer functions, and .
3.3 Examples | 72

![이미지](images/page079_img00.webp)

![이미지](images/page079_img01.webp)

3.3.15 Example
Consider the feedback system shown below:
73 | 3.3 Examples

![이미지](images/page080_img00.webp)

Apply Mason’s Gain formula to obtain the system transfer function and the disturbance transfer
function .
3.3.16 Example
Consider the following signal flow graph, where the system parameters are as follows:
.

![이미지](images/page080_img01.webp)

Apply the Mason’s Gain Formula to find the system transfer function . Once you have the transfer
function, find the system poles, zeros, multiplier gain, DC gain, and then write out the transfer function in the
TF format as well as in ZPK format. Derive the analytical function describing the step response of this system.
3.3.17 Example
Consider the following signal flow graph representing a certain control system:
3.3 Examples | 74

![이미지](images/page081_img00.webp)

Apply the Mason’s Gain Formula to find the system transfer function and write out the transfer
function in the TF format (polynomial ratio). Find the analytical expression for a response of the system to a
normalized unit step reference.
3.3.18 Example
Consider the following transfer function of a certain process G(s):

![이미지](images/page081_img01.webp)

Complete a signal flow graph diagram so that it will represent G(s). Justify your sketch by applying the Mason’s
Gain formula to verify the transfer function. Assume that the process G(s) is going to work in a unit feedback
closed loop system under Proportional Control. Find the practical range of values for the Controller Gain for
a stable operation of the closed loop system, and the value of Operational Gain, such that the Gain Margin
is 2.
3.3.19 Example
Consider the block diagram of a servo-control system for one of the joints of a robot arm, shown next.
75 | 3.3 Examples

![이미지](images/page082_img00.webp)

The input is the reference angular velocity (speed) for the robot arm, the output is the actual load velocity of
the arm, and the forward path contains a Proportional + Integral (PI) Controller, a calibration gain, motor and
robotic arm dynamics and a gearbox. The Proportional + Integral (PI) Controller is described as:
Find the closed loop system transfer function, , in terms of the PI Controller gains, and Next, find
the practical ranges of the controller gains, and , such that the closed loop system is stable.
3.3.20 Example
Consider again the block diagram of the servo-control system for one of the joints of a robot arm, discussed
in Example 3.3.19. Apply Mason’s Gain Formula to compute the transfer function of the closed loop system and
check to see that the result is the same.
3.3.21 Example
Consider the block diagram of a servo-control system for one of the joints of a robot arm, shown next.
3.3 Examples | 76

![이미지](images/page083_img00.webp)

It is very similar to the one in Example 3.3.19, except the input is now the reference angle (position) of the robot
arm, and the output is the actual load position of the robotic arm, as opposed to the velocity of the arm. The
forward path contains a Proportional + Derivative (PD) Controller, a calibration gain, motor and robotic arm
dynamics and a gearbox. Find the closed loop system transfer function, , in terms of the PD Controller
gains, and . The Proportional + Derivative (PD) Controller is described as:
Next, find the practical ranges of the controller gains, and , such that the closed loop system is stable.
3.3.22 Example
Consider the block diagram of a servo-control system for one of the joints of a robot arm, shown next, very
similar to the one in Example 3.3.21, where the input is the reference angle (position) of the robot arm, and
the output is the actual load position of the robotic arm. However, observe the small, but significant difference
in the placement of the feedback loop. The forward path again contains a Proportional + Derivative (PD)
Controller, a calibration gain, motor and robotic arm dynamics and a gearbox. Find the closed loop system
transfer function, , in terms of the PD Controller gains, and . Next, find the practical ranges of
the controller gains, and , such that the closed loop system is stable.
77 | 3.3 Examples

![이미지](images/page084_img00.webp)

3.3.23 Example
Consider a certain process that is represented by the following signal flow graph:

![이미지](images/page084_img01.webp)

Apply the Mason’s Gain Formula to find the transfer function it represents. Next, answer the following
questions: What is the process DC Gain? What is the process transfer function Gain? What are the initial and
final values of the process impulse response? What are the initial and final values of the process step response?
3.3.24 Example
Part 1. Consider a signal flow graph as shown. Find the transfer function it represents. Show all loop and
path gains.
3.3 Examples | 78

![이미지](images/page085_img00.webp)

Part 2. The process is to work in a closed loop configuration as shown next. Find the closed loop transfer
function of the system and establish the range of positive gain K values that would result in a stable closed loop
system response. Find the critical gain at which the system would be marginally stable.

![이미지](images/page085_img01.webp)

79 | 3.3 Examples
CHAPTER 4
Chapter 4 | 80
4.1 Introduction
Recall that the Implicit Control Objective is to ensure that the closed loop system is stable. Once that is achieved,
the Explicit Control Objective is to force the process output to follow, or track, a desired reference signal, even
in presence of an unexpected, and unwanted, disturbance. The reference signal may be constant, in which case
we refer to the control system as the Regulator System, or varying, in which case we refer to the control system
as the Tracking System. A special case of Regulation is when the constant reference signal is equal to zero. In
Regulation, the most important objective is to effectively reject disturbances. In case of tracking, the accuracy,
or quality, of the response (i.e. how close the output is to the reference) is important both in the steady state and
in transient.
Examples of signals – steps, ramps, sinusoids, parabolic, and any arbitrary time varying signals. Note that in a
Linear Time Invariant (LTI) system, an arbitrary time signal can be seen as a superposition of a set of standard
signals. We need to evaluate how well the process is doing. Quality of response has to be quantified. This can be
done through:
• Performance Specifications
• Performance Indices
• Transient behavior specifications – based on Step Response
• Steady state behavior specifications – Error Analysis
81 | 4.1 Introduction
4.2 Standard Time Inputs
Since there is an infinite number of possible inputs (trajectories) that a control system may have to follow, it
is impossible to test all of them. Thus, we do testing with Standard Inputs that are power of time functions as
shown in Table 4‑1.

![이미지](images/page088_img00.webp)

Table 4-1: Standard Power of Time Inputs
Since we assume that we are dealing with LTI systems, the Principle of Superposition holds:
• Any arbitrary signal can be built using these Standard Power of Time Inputs (“building blocks”);
• The response to a complex input that is a sum of those, will be a sum of responses to each of the Standard
Inputs;
• As long as the system response to each of the Standard Power of Time Inputs is adequate, the overall
response will also be adequate.
We will consider two time frames: Transient, and Steady State, as illustrated in Figure 4‑1. Step input, because
of its discontinuity, is a very “harsh” input for a control system to follow and thus is chosen as a standard testing
input to check for the quality of a system Transient Response. Higher order of time signals are also required to
adequately test for the quality of the system Steady State response.
4.2 Standard Time Inputs | 82

![이미지](images/page089_img00.webp)

Figure 4-1: Step response of a System
The next section will provide definitions of several “Figures of Merit” to judge the quality of the transient
response and the steady state response. They are: Percent Overshoot (PO), Settling Time ( ), Rise Time (
)and Steady State Error for a step response in % ( ). All these Figures of Merit, or “Step Response
Specifications”, can be read off the graph of the actual step response, which can be obtained experimentally, or
simulated using software.

| HINT: In a test all the values have to be read off the graph and then the Step Response Specificationshave to be calculated. However, when you work on a lab or assignment project, you can use MATLAB tohelp with that. MATLAB has several functions that can help with that; as well, a very handy m-file called“stepeval.m” was written specifically for this course and can be downloaded from the course Blackboard– see the Lab Folder. |
| --- |

![이미지](images/page089_img01.webp)

83 | 4.2 Standard Time Inputs
4.3 Step response specifications -
Definitions
4.3.1 Percent Overshoot
Maximum Overshoot is defined as:
Equation 4‑1
Percent Overshoot is defined as:
% Equation 4‑2

![이미지](images/page090_img00.webp)

Figure 4-2: Definition of Percent Overshoot
Note that while the constant reference signal (which can be referred to as ) in Figure 4‑2 is shown as unit (1),
in fact it does not have to be that, and can be any value.
4.3 Step response specifications - Definitions | 84
4.3.2 Settling Time
The Settling Time is defined, as shown in Figure 4‑3, as either – within 5% of the steady
state value, or – within 2% of the steady state value.

![이미지](images/page091_img00.webp)

Figure 4-3: Definition of Settling Time
4.3.3 Rise Time
The Rise Time is defined, as shown in Figure 4‑4, as either calculated as time from 10% to 90% of the
steady state value of the output, , or from 0 to 100% of the steady state value of the output, .
4.3.4 Steady State Error
The Steady State Error is defined, as shown in Figure 4‑5 and Equation 4‑3:
85 | 4.3 Step response specifications - Definitions

![이미지](images/page092_img00.webp)

Figure 4-4: Definition of Rise Time

![이미지](images/page092_img01.webp)

Figure 4-5: Definition of Steady State Error
4.3 Step response specifications - Definitions | 86
4.4 Examples
4.4.1 Example
Consider a unit step response of an unknown control system as shown. Find the system step response
specifications. HINT: Read the required values off the plot, then compute the specifications.

![이미지](images/page093_img00.webp)

4.4.2 Example
Consider the system described by a transfer function below. Find the system step response specifications.
HINT: Simulate the system step response in MATLAB, plot it and read off the plot the required values.
4.4.3 Example
Consider the system described by a transfer function below. Find the system step response specifications.
HINT: Simulate the system step response in MATLAB, plot it and read off the plot the required values.
87 | 4.4 Examples
4.4.4 Example
Consider the response of a certain control system to a unit reference signal, shown below. Read off transient (i.e.
percent overshoot, rise time, etc.) as well as steady state specifications.

![이미지](images/page094_img00.webp)

4.4 Examples | 88
CHAPTER 5
89 | Chapter 5
5.1 Equivalent Unit Feedback Loop
Consider a typical single feedback loop system:

![이미지](images/page096_img00.webp)

Figure 5-1: Typical Feedback Loop
In most cases the system will be non-unit feedback. For example, y(t) may be a temperature signal, and b(t)
will be a voltage signal out of a thermocouple (sensor). The input signal u(t) will also be a voltage signal. It is
pointless to make comparisons between u(t) and y(t). Let us introduce the reference signal, r(t) (a desired level
of output, and not a physical quantity), and the so-called system error, e(t):
Equation 5‑1
These signals can then be introduced into the system block diagram:

![이미지](images/page096_img01.webp)

Figure 5-2: Modified Block Diagram with Reference Signal
An equivalent unit feedback loop system will be then:
5.1 Equivalent Unit Feedback Loop | 90

![이미지](images/page097_img00.webp)

Figure 5-3: Equivalent Unit Feedback Loop
The steady state error analysis can then be performed on the equivalent system, for the system error signal e(t)
(or E(s) in Laplace domain), and the reference signal r(t) (or R(s) in Laplace domain). However, in the physical
system the input is u(t) (or U(s) in Laplace domain), and the controller input is the actuating error (or
in Laplace domain). Note that the equivalent unity feedback loop has the “open loop transfer function”,
G(s)H(s), in its forward path:
Equation 5‑2
91 | 5.1 Equivalent Unit Feedback Loop
5.2 Steady State Error Analysis in an
Equivalent Unit Feedback Loop
Consider a unit feedback loop system shown in Figure 5‑4. Note that typically a system does NOT have a unit
feedback – this configuration is a result of an equivalent manipulation of the block diagram as shown above.

![이미지](images/page098_img00.webp)

Figure 5-4: Unit Feedback Loop
The system error was defined in Equation 5‑2. Assume the open loop transfer function of the system to be in
a polynomial form as shown in Equation 5‑3 where N – number of integrators (poles at the origin) in the open
loop transfer function, is called the system type. System type affects the steady state accuracy of the system
response.
Equation 5‑3
If the system is stable, then the Final Value Theorem applies:
Equation 5‑4
5.2.1 Steady State Error for a Step Input
The steady state error can now be evaluated for three Standard Power-of-Time Inputs: step, ramp and parabola.
Let’s start with a step input:
5.2 Steady State Error Analysis in an Equivalent Unit Feedback
Loop | 92
Equation 5‑5
Define the position error constant:
Equation 5‑6
The steady state error is then:
Equation 5‑7

![이미지](images/page099_img00.webp)

Table 5-1: Position Constants and Errors for Step Input
Note on the plots, that while tracking in the Steady State improves as the system type goes up (i.e. the Steady
93 | 5.2 Steady State Error Analysis in an Equivalent Unit Feedback Loop
State Error is reduced), the transient response of the system is becoming more and more oscillatory. This is
the result of a presence of integrators (one for System Type One, and two for System Type Two). The more
integrators in closed loop, the more difficult it is for the system to maintain stability. That is why we don’t use
control systems of Type higher than Two.
An important observation here, that we will return to later, is that presence of integrators reduces relative
stability of a system, i.e. reduces the system Gain Margin.
5.2.2 Steady State Error for a Ramp Input
Check Laplace Tables entry for a ramp input:
Equation 5‑8
Define the velocity error constant:
Equation 5‑9
The steady state error is then:
Equation 5‑10
5.2.3 Steady State Error for a Parabolic Input
Check Laplace Tables entry for a ramp input:
Equation 5‑11
Define the velocity error constant:
5.2 Steady State Error Analysis in an Equivalent Unit Feedback Loop | 94
Equation 5‑12
The steady state error is then:
Equation 5‑13

![이미지](images/page101_img00.webp)

Table 5-2: Velocity Constants and Errors for Ramp Input
95 | 5.2 Steady State Error Analysis in an Equivalent Unit Feedback Loop

![이미지](images/page102_img00.webp)

Table 5-3: Acceleration Constants and Errors for Parabolic Input
5.2 Steady State Error Analysis in an Equivalent Unit Feedback Loop | 96
5.3 Examples
5.3.1 Example
Consider a unit feedback control system under Proportional Control as shown:

![이미지](images/page103_img00.webp)

Find the closed loop system type, error constants and errors.
5.3.2 Example
Consider a unit feedback control system under Proportional Control as shown:

![이미지](images/page103_img01.webp)

Find the closed loop system type, error constants and errors.
5.3.3 Example
Consider a unit feedback control system under Proportional Control as shown:
97 | 5.3 Examples

![이미지](images/page104_img00.webp)

Find the closed loop system type, error constants and errors.
5.3.4 Example
Consider a plot showing a closed loop response of a certain control system in a closed loop configuration to a
normalized unit reference input. What is the System Type, N?

![이미지](images/page104_img01.webp)

5.3.5 Example
Consider the rotational positioning control system as shown, subject to a torque disturbance, and
with a reference position signal, . Using normalized units, assume a unit reference signal and the
disturbance of a 0.2 magnitude. What condition would the Proportional Gain have to meet in order to
maintain the steady state error of the system response to be less than 10%?
5.3 Examples | 98

![이미지](images/page105_img00.webp)

5.3.6 Example
Consider again the system under Proportional Control, as shown in Example 2.6.4. Find the range of operational
gains such that the system is stable AND the steady state error to the unit step reference signal is less than 10%.
When the error is exactly 10%, what is the system Gain Margin? Is it possible to operate the closed loop system
that the steady state error requirement is no more than 5%?
5.3.7 Example
Consider again the block diagram from Example 2.6.3. What is the System Type? Determine the system error
constants and the corresponding closed loop system errors when the system tracks a unit step reference signal,
a unit ramp reference signal and a unit parabolic reference signal.
Next, find the range of operational gains such that such that the system is stable AND the steady state error to
the unit step reference signal is less than 10%. When the error is exactly 10%, what is the system Gain Margin? Is
it possible to operate the closed loop system that the steady state error requirement is no more than 5%? If yes,
why? If no, why?
5.3.8 Example
Consider the following block diagram describing a system under Proportional-Integral control (PI):
99 | 5.3 Examples

![이미지](images/page106_img00.webp)

Part 1. Find the system closed loop transfer function, , in terms of the controller gains and .
Part 2. Determine the System Type, and calculate the position, velocity and acceleration constants
and the corresponding steady state errors to unit step, ramp and parabolic input signals, all in
terms of the controller gains and .
Part 3. Use the Routh-Hurwitz criterion to obtain an expression for gain in terms of gain so that the
closed loop stability is achieved.
Part 4. Find the minimum values of and such that the closed loop stability is achieved and the steady
state error to an input signal is less than or equal to 0.1 V/V.
5.3.9 Example
Consider the following block diagram describing a system under Proportional + Rate Feedback Control:

![이미지](images/page106_img01.webp)

Determine the system type, error constants and errors in terms of the system controller gains. Next, assume
the steady state error for the closed loop response is supposed to be 10%. What should be the value of the
Proportional Gain?
5.3 Examples | 100
5.3.10 Example
Consider a response of a certain closed loop control system to a unit reference signal, shown in figure below.
Read off appropriate values and/or calculate transient specifications (
) and identify system type, errors and error constants.

![이미지](images/page107_img00.webp)

5.3.11 Example
An actuator/process in a unit feedback closed loop configuration has the following transfer function:

![이미지](images/page107_img01.webp)

Part 1. Determine the system type number, and calculate the system error constants and .
101 | 5.3 Examples
Part 2. Find the steady state error to an input signal , where .
5.3.12 Example
Consider the following block diagram describing a system under Proportional-Integral control (PI):

![이미지](images/page108_img00.webp)

Find the system open loop transfer function, . Determine the system type number, and compute
the position, velocity and acceleration constants , and the corresponding steady state errors to
unit step, ramp and parabolic input signals. Use the Routh-Hurwitz criterion to obtain an expression for gain
in terms of gain so so that the closed loop stability is achieved. Find the minimum values of and
such that the marginal closed loop stability is achieved and the steady state error to an input signal signal
is less than or equal to 0.1. Compute the resulting closed loop system pole locations.
5.3.13 Example
Let us re-visit the feedback system from Example 3.3.15, where we found the system transfer function using
Mason’s Gain Formula. Let us consider continuing with this question – given the unit reference, calculate the
smallest gain that can be used if the steady state error to a step load disturbance d(t) is to be less than 1%.
Calculate the Gain Margin of the system at this value of gain . Is the system stable?
5.3.14 Example
Let us re-visit the feedback system from Example 3.3.19. Recall that we determined the stability conditions for
this example. Next, consider the error requirements. The step response of the closed loop system should have a
steady state error of less than 5%, and the unit ramp response should have a steady state error of 0.15 V/V; Find
the required Controller gains, and , to meet these conditions. Will the closed loop system be stable at
these values?
5.3 Examples | 102
5.3.15 Example
Let us re-visit the feedback system from Examples 2.6.11 and Example 3.3.12. Show why it is not possible to
operate the system so that the Steady State Error for a step input is . CAUTION:
Input of is NOT in S.I. units! Next, find the Controller gain such that the Steady State Error for a step input is
.
5.3.16 Example
Let us re-visit the feedback system from Examples 2.6.11, 3.3.12 and 5.3.15, but consider now that the disturbance
signal is positive, as shown below. Let’s also change the values of the system parameters, and of the inputs
– the systems parameters are as follows: , – amplifier gain, –
motor torque constant, – armature resistance, – armature inductance,
– CEMF constant, – motor & load inertia, and – motor & load linear
friction coefficient, , .

![이미지](images/page109_img00.webp)

Show why it is not possible to operate the system so that the Steady State Error for a
step input is . Next, find if it is possible that the Steady State Error for a step input is
step input is .
5.3.17 Example
Let us re-visit the feedback system from Examples 2.6.11, 3.3.12, 5.3.15 and 5.3.16, but consider now the system
without the disturbance signal, as shown below. Let’s also change the values of the system parameters, as
follows:
, , ,
103 | 5.3 Examples
, and . Determine if it is possible to operate the system
at such Proportional Gain value, , that the Gain Margin, , is equal to 2 V/V, and the Steady State Error for
the unit ramp input, , is equal to 0.1 V/V.
5.3.18 Example
Let us re-visit the feedback system from Example 3.3.19. In it, we derived the transfer function of the robotic arm
under the Proportional + Integral (PI) Controller, where the input was the reference angular velocity (speed) for
the robot arm, the output is the actual load velocity of the arm. The transfer function was as follows:
We also investigated the system stability, and found the practical condition to be that both controller gains
have to be positive ( and ) – see solution to Example 3.3.19 for details. Now let us consider the
following questions. The unit step response of the closed loop system should have a steady state error of less
than 5%, and the unit ramp response should have a steady state error of 0.15 V/V. Find the required Controller
gains, and , to meet these conditions. Will the closed loop system be stable at these values?
Next, assume that the operating Controller gains are: Find the expression for a unit step
response of this system, . HINT: one of the closed loop poles is at – 5.
5.3.19 Example
Let us re-visit the feedback system from Example 3.3.21. In it, we derived the transfer function of the robotic arm
under the Proportional + Integral (PI) Controller, where the input was the reference angular velocity (speed) for
the robot arm, the output is the actual load velocity of the arm. The transfer function was as follows:
We also investigated the system stability, and found the practical condition to be that both controller gains
have to be positive ( and ) – see solution to Example 3.3.19 for details. Now let us consider the
following questions. The unit step response of the closed loop system should have a steady state error of less
than 5%, and the unit ramp response should have a steady state error of 0.15 V/V. Find the required Controller
gains, and , to meet these conditions. Will the closed loop system be stable at these values?
Next, assume that the operating Controller gains are: Find the expression for a unit step
response of this system, . HINT: one of the closed loop poles is at – 9.
5.3.20 Example
Let us re-visit the feedback system from Example 3.3.22. In it, we derived the transfer function of the robotic arm
under the Proportional + Integral (PI) Controller, where the input was the reference angular velocity (speed) for
the robot arm, the output is the actual load velocity of the arm. The transfer function was as follows:
5.3 Examples | 104
We also investigated the system stability, and found the practical condition to be that both controller gains
have to be positive ( and ) – see solution to Example 3.3.19 for details. Now let us consider the
following questions. The unit step response of the closed loop system should have a steady state error of less
than 5%, and the unit ramp response should have a steady state error of 0.15 V/V. Find the required Controller
gains, and , to meet these conditions. Will the closed loop system be stable at these values?
Next, assume that the operating Controller gains are: Find the expression for a unit step
response of this system, . HINT: one of the closed loop poles is at – 9.
5.3.21 Example
Let us re-visit the feedback system from Example 2.6.14. In it, we derived the closed loop transfer function of the
system under the Proportional Control. The transfer function was found to be as follows:
Find the required Controller gain ( ) so that all three of the following conditions are met:
• Stable operation with a positive Proportional Gain;
• Steady State Error for step input: ;
• Gain Margin: .
105 | 5.3 Examples
CHAPTER 6
Chapter 6 | 106
6.1 First order systems
A first order system is described by the transfer function in Equation 6‑1:
Equation 6‑1
has only one pole, and no zeros. Its unit step response can be derived as shown in Equation 6‑2:
Equation 6‑2
Note that:
Equation 6‑3
If the unit step input is used, the process DC gain and time constant can be evaluated directly from the graph,
as shown in the following example.
6.1.1 Example
Consider a plot of the response of a certain unknown process, shown in Figure 6‑1. We would like to derive a
model for this unknown system, i.e. a transfer function that would give a response closest to that of our system,
let’s call it . The response looks like an exponential rise with a non-zero slope at t=0, and is therefore
identified as the response of a first order process (system). As such, the response can be described by the
following equation:
107 | 6.1 First order systems

![이미지](images/page114_img00.webp)

Figure 6-1: First Order System response
6.1 First order systems | 108
6.2 Second Order Overdamped Systems
Consider a second order system described by the transfer function in Equation 6‑4. where transfer function G(s)
has two real poles, and no zeros. Its unit step response can be derived using partial fractions and is shown in
Equation 6‑5. Its step response is shown in Figure 6‑2.

![이미지](images/page115_img00.webp)

Figure 6-2: Second Order, Overdamped Response
Equation 6‑4
Equation 6‑5
Note that:
Equation 6‑5
If the unit step input is used, the process DC gain can be evaluated directly from the graph, in the same manner
as we did for the first order system. However, unlike in the first order system case, the two Time Constants
cannot be found directly from the plot. For a second order (and higher orders as well) systems, the derivative
of the step response at t = 0 is equal to zero. This means that the step response is “S-shaped” towards t = 0. The
109 | 6.2 Second Order Overdamped Systems
closer the two Time Constants are, the more pronounced “S-shape”. If , the response may resemble
more the first order system response. If the “S-shape“ is visible, the two Time Constants may be “guesstimated”
as shown in Figure 6‑2. The Time Constants can then be iterated by simulation, through having the model
response plot adjusted for the “best fit” with the measured response.
6.2.1 Example
Consider a plot showing a response of a certain unknown process to a normalized unit step input. Derive an
appropriate transfer function model for this process.

![이미지](images/page116_img00.webp)

6.2 Second Order Overdamped Systems | 110
CHAPTER 7
111 | Chapter 7
7.1 Second Order Underdamped Systems
Consider a second order system described by the transfer function in Equation 7‑1, where is called the
system damping ratio, and is called the frequency of natural oscillations. We will later show that the system
oscillation depend on the value of the damping ratio .The underdamped second order system step response is
shown in Figure 7‑1 where different colours correspond to different damping ratios – the smaller the damping,
the larger the oscillation.
Equation 7-1

![이미지](images/page118_img00.webp)

Figure 7-1 Step response of a Second Order Underdamped System
Recall that the solution for quadratic roots is as follows:
Depending on the value of , we will have three distinct cases:
7.1 Second Order Underdamped Systems | 112
• if , there are two real, distinct roots. Note that this would be a case with the previously discussed,
second order system where we identified two Time Constants. Its response is referred to as an
overdamped response, and the system is called an overdamped 2nd order system, where the two poles
are:
• if , there are two identical roots, or we can say, one double root. The response is referred to as a
critically damped response, and the system is called a critically damped system, with a double pole:
• if , there are two complex, conjugate roots, and the response is a sinusoid with an exponential
envelope. This oscillatory response is called an underdamped response, and the system is called a second
order underdamped system where the two poles are:
Applying the quadratic roots solution to the denominator of G(s), we have:
Equation 7-2
Again, depending on the value of , we will have these three distinct cases.
• If then and the roots are real (i.e. the system is overdamped with two real poles, and there
are two exponentially damped transients);
• If then and the roots are real and identical (i.e. the system is critically damped with two
equal real poles, and there are two transients – one is an exponential, the other is time multiplied by an
exponential)
• If then and the roots are complex conjugates (i.e. the system is underdamped with two
complex poles, and the transient is an exponentially damped sinusoid);
Equation 7-3
The overdamped case was discussed in Chapter 6.2. It is of no particular interest in Control Systems design
because the system response time is slow – the system speed is measured by the Rise time and the Settling
Time. The critically damped case cannot be visually identified from the overdamped case and is of interest
only as the borderline behaviour between the two distinct cases: overdamped and underdamped responses.
From the point of view of Control Systems Design, only the latter is of interest, as an underdamped system
has fast response times. The downside of course is that the faster it is, the less damping, and therefore it is
more oscillatory, but in the design part we will learn to “fix” that. Transfer function G(s) in Equation 7‑1 has two
113 | 7.1 Second Order Underdamped Systems
complex poles, and no zeros. The pole locations in the complex plane are shown in Figure 7‑2. In it, is
called a decay rate. Its inverse, is called the time constant of the system.
The pole locations in the complex plane are shown in Figure 7‑2. In it, is called a decay rate. Its inverse,
is called the time constant of the system.

![이미지](images/page120_img00.webp)

Figure 7-2: Second Order System Pole Location
Note that the damping ratio can be calculated from the trigonometrical relationship shown in Figure 7‑2.
Equation 7-4
7.1 Second Order Underdamped Systems | 114
The unit step response of G(s) can be derived using standard Table of Laplace Transforms:
Equation 7-5
If the unit step input is used, the process DC gain and time constant can be evaluated directly from the graph,
as was illustrated in previous chapters. We will now demonstrate that the damping ratio and the frequency of
natural oscillations can be evaluated from the response plot as well.
115 | 7.1 Second Order Underdamped Systems
7.2 Response Specifications for the
Second Order Underdamped System
7.2.1 Percent Overshoot
Peak Time is defined as the time the oscillatory response reaches its maximum, as shown in Figure 7‑3. let us
assume that the process is described by the transfer function in Equation 7‑1. The Peak Time can be found as
the time corresponding to the maximum of the system step response. The maximum of a function is found by
taking the derivative and setting it to zero, but rather than finding the maximum of the time function, we use
the Laplace Transform domain, as shown in Equation 7‑6.
7.2 Response Specifications for the Second Order
Underdamped System | 116
Equation 7-6
The time when y(t) reaches its maximum is at
117 | 7.2 Response Specifications for the Second Order Underdamped System

![이미지](images/page124_img00.webp)

Figure 7-3 Percent Overshoot Derivation for a Second Order Underdamped System
From Equation 7‑6 we now can calculate the Peak Time, :
Equation 7-7
Percent Overshoot can now be found by substituting the Peak Time, into the step response function
described by Equation 7‑5:
Equation 7-8
To solve Equation 7‑8, use the trigonometrical formula for the sine of a sum of two angles:
Recall that from Figure 7‑2 we have:
Thus:
Substitute this into Equation 7‑8 for the output maximum:
7.2 Response Specifications for the Second Order Underdamped System | 118
Equation 7-9
Finally, we can use the defining equation describing the Percent Overshoot, i.e. Equation 4‑2:
Equation 7-10
The relationship between Percent Overshoot PO and damping ratio is inversely proportional, as shown in
Figure 7‑4: The smaller the damping ratio, the larger the overshoot. When , the system is marginally
stable, i.e. the response show undamped oscillations of a constant amplitude, and PO = 100%.
Equation 7‑10 can be also solved for damping ratio if the Percent Overshoot is known, but it is tedious, hence
the suggestion to use Figure 7‑4 to read off the value of rather than compute it. The computation, if
performed, would be as follows – start with taking a natural log of both sides of the equation:
Equation 7-11
119 | 7.2 Response Specifications for the Second Order Underdamped System

![이미지](images/page126_img00.webp)

Figure 7-4: Relationship between Damping Ratio and Percent Overshoot.
7.2.2 Settling Time
Recall the definition of the Settling Time, as shown in Figure 4‑3. Also recall that the exponential decays to
approximately 5% of its original value after three Time Constants (i.e. 3 ) and to approximately 2% of its original
value after approximately four Time Constants (i.e. 4 ). Thus, the function will reach approximately
95% of its steady state value (i.e. ), after , and will reach approximately 98% of its steady state value (i.e.
1), after :
Now recall that the step response of the second order underdamped system in Equation 7‑5 is an
exponentially damped sine function. The Time Constant of the exponential envelope is shown in Equation 7‑12:
Equation 7-12
Therefore the two definitions of the Settling Time can be described as follows:
7.2 Response Specifications for the Second Order Underdamped System | 120
Equation 7-13
Equation 7-14
7.2.3 Rise Time
Recall the definition of the Rise Time, as shown in Figure 4‑4. Consider the 0 to 100% definition – we are looking
for the time where the step response output crosses for the first time the steady state value, . The steady
state value of the step response as calculated in Equation 7‑5, is equal to the DC gain:
Equation 7-15
Therefore, when , we have the output equal to DC gain:
At the same time, substituting we have:
What follows is:
Equation 7-16
Next, we will use a linear approximation to find the Rise Time from 10% of the steady state to 90% of the steady
state – we will assume that the 80% increase of the output corresponds to 80% of the time it takes for the
output to increase from 0 to 100%:
121 | 7.2 Response Specifications for the Second Order Underdamped System
Equation 7-17
It can be shown empirically (i.e. by observation), that Equation 7‑17 can also be approximated by another very
simple relationship:
Equation 7-18
7.2.4 Steady State Error
Recall the steady state value of the step response, shown in Equation 7‑15 for the normalized unit input (
) is equal to: . Note that, in general, , where the constant reference could
be non-unit. Next, substitute it to the definition of the steady state error in Equation 4‑3:
Equation 7-19
Equation 7‑19 means that to minimize the closed loop steady state error, the closed loop DC gain, , should
be as close to 1 as possible. We can also look at the closed loop steady state error by considering the open loop
DC gain, . Increasing the open loop DC gain, , brings the closed loop DC gain
closer to 1: , and thus also reducing the closed loop steady state error. The relationship between
the open loop DC gain and the closed loop DC gain is:
Equation 7-20
The relationship between the closed loop steady state error and the open loop DC gain therefore is:
Equation 7-21
Equation 7‑21 reinforces what we also see in Equation 7‑19 – that to minimize the steady state error, the open
loop DC gain has to be as large as possible without destabilizing the system: .
Now recall that the open loop DC gain is also a definition of the Error Position Constant:
Therefore, Equation 7‑21 is the same as Equation 5‑7. If the Position Constant, , has a constant value,
, the System Type is equal to and the steady state error always exists. Recall from Chapter
7.2 Response Specifications for the Second Order Underdamped System | 122
5.2.1, that to reduce the steady state error to zero, , the Error Position Constant, , which is the
same as the open loop DC gain, , has to be equal to infinity, , and the System Type
becomes equal to 1 (the open loop transfer function has one integrator).
123 | 7.2 Response Specifications for the Second Order Underdamped System
7.3 Examples
7.3.1 Example
Consider a certain closed loop control system as shown:

![이미지](images/page130_img00.webp)

Find the closed loop system transfer function and determine the system parameters . Next,
determine the following step response specifications: Percent Overshoot (PO), Settling Time ( ),
Rise Time ( ), period of oscillations ( ), and frequency of damped oscillations ( ), the
System Type, Error Constants and Steady State Errors for the step, ramp and parabolic inputs.
7.3.2 Example
Consider a certain closed loop system operating under Proportional Control as shown, and find the gain value
such that the system is stable and PO is approximately 20%. What is the Settling Time? Can it be improved?

![이미지](images/page130_img01.webp)

7.3.3 Example
Consider a pole-zero map of a certain closed loop system, as shown. Estimate the settling time, , of
the system step response and the closed loop system damping ratio.
7.3 Examples | 124

![이미지](images/page131_img00.webp)

7.3.4 Example
Consider an unknown closed loop system with a normalized (i.e. scaled so that the reference input is equal to )
step response as shown. Find an appropriate model for the closed loop transfer function.
125 | 7.3 Examples

![이미지](images/page132_img00.webp)

7.3.5 Example
Consider a response of a closed loop control system from Example 5.3.10. Read off transient and steady state
step response specifications ( and ). Based on the
information, build an appropriate second order model for the system with such step response as shown.
7.3.6 Example
Consider a certain closed loop control system described by the following transfer function:
Find the closed loop system damping ratio, frequency of natural oscillation and closed loop DC gain.
Next, estimate the following transient response specifications: percent overshoot (PO), settling time (
), period ( ), and frequency of damped oscillations (), as well as the following steady state
specifications of this closed loop system: System Type as well as Position Constant, steady state error to a step
input (in %), Velocity Constant, steady state error to a ramp input, Acceleration Constant and steady state error
to a parabolic input.
How many cycles of oscillations will be visible in the system response? Justify your answer.
7.3 Examples | 126
7.3.7 Example
Consider a response of a certain closed loop control system to a unit reference signal, shown in figure below.

![이미지](images/page133_img00.webp)

Read off appropriate values and/or calculate transient specifications (PO, settling time ( ), period (
) for this step response. Identify the System Type, Steady State Errors to unit step, ramp and parabolic
inputs, as well as the corresponding Position, Velocity and Acceleration Constants. Based on the information
read off in Part 1, create a second order model for the closed loop system with the response shown. Find the
following system parameters: , as well as the complete model transfer function .
7.3.8 Example
Consider a certain closed loop control system described by the following transfer function:
Find the following model parameters: . Estimate transient response specifications (PO, settling
time ( ), period ( ) and steady state specifications of this closed loop system (System Type,
).
127 | 7.3 Examples
7.3.9 Example
Consider four separate second order systems, with the locations of their pole pairs shown. Answer the following
questions and give brief justification to your answer.
Q: Which of the four systems exhibits the largest percent overshoot (PO) in its step response?
Q: Which of the four systems is unstable?
Q: Which of the four systems exhibits the shortest settling time in its step response?
Q: Which of the four systems has the highest frequency of oscillations in its step response?
Q: Which of the four systems exhibits the longest settling time in its step response?
Q: Which of the four systems exhibits the smallest percent overshoot (PO) in its step response?
Q: Which of the four systems has the smallest steady state error?
Q: What is the System Type?

![이미지](images/page134_img00.webp)

7.3.10 Example
Consider closed loop responses of two different control systems (System A and System B), as shown. Match
them to their appropriate pole locations also shown, briefly explain why.
7.3 Examples | 128

![이미지](images/page135_img00.webp)

![이미지](images/page135_img01.webp)

7.3.11 Example
Consider a normalized step response of a certain LTI system, as shown. The reference is assumed to be a unit
step.
129 | 7.3 Examples

![이미지](images/page136_img00.webp)

Determine the Percent Overshoot (in %), Steady State Error (in %) and the Settling Time (within ±2% of the final
value) for this response. Next, assume that this system can be modeled by a standard 2nd order model and
calculate the appropriate parameters.
7.3.12 Example
Consider a response of a certain closed loop control system to a unit reference signal, shown in figure below.
7.3 Examples | 130

![이미지](images/page137_img00.webp)

Read off appropriate values and/or calculate transient specifications (PO, settling time ( ), period (
) for this step response. Based on the information read off in Part 1, create a second order model for the
closed loop system with the response shown. Find the following system parameters: , as well as the
complete model transfer function . Identify the System Type, Steady State Errors to unit step, ramp
and parabolic inputs, as well as the corresponding Position, Velocity and Acceleration Constants.
7.3.13 Example
Consider a step response to a unit reference input of a control system as shown. Estimate the following specs:
Percent Overshoot, Settling Time the Steady State Error. What are your estimates of the closed loop damping
ratio , the frequency of natural oscillations , and the DC gain?
131 | 7.3 Examples

![이미지](images/page138_img00.webp)

7.3.14 Example
A step response of a certain control system is supposed to exhibit no more than 5% overshoot and to settle
(use the 2% definition of the settling time) within (2) seconds. Show a shaded area in the S-Plane where the
dominant closed loop poles of the system should be located so that both conditions are met.
7.3.15 Example
Consider the closed loop control system as shown here.

![이미지](images/page138_img01.webp)

For seconds, the desired closed loop ratio is to be . Find the corresponding Controller gain K
7.3 Examples | 132
and the resulting settling time of the closed loop step response. Next, assume that the desired closed loop ratio
is still to be . but we would like to shorten the settling time to seconds. If the time
constant is variable, what value would it have to be? For that case, find the corresponding Controller gain K.
The closed loop system characteristic equation Q(s) is a quadratic, resulting in TWO closed loop poles:
Assume that K = 0.25 and is a variable:
Find analytical expressions for both poles as a function of .
7.3.16 Example
Consider two closed loop systems as shown in the first block diagram:

![이미지](images/page139_img00.webp)

The process transfer function is given by:
Show that the closed loop system of the first system is of a second order. Find the range of gains for closed
loop stability, the critical gain and the frequency of resulting marginally stable oscillations. Next, reconfigure
the controller as shown in the second block diagram and show that both closed loop systems have the same
characteristic equation.
133 | 7.3 Examples

![이미지](images/page140_img00.webp)

Suppose that a choice of K is made so that both of the closed loop systems are stable. The graph shown
next illustrates their step responses for this choice of K. Identify which step response corresponds to which
configuration. Briefly justify your answer.

![이미지](images/page140_img01.webp)

7.3.17 Example
Consider again the system from Example 5.3.9, describing a certain system under Proportional + Rate Feedback
Control. Find the closed loop system transfer function in terms of controller gains and and determine
values of the controller gains such that PO = 10% and Settling time (within ) = 1 second. Write out the
closed loop transfer function of the system for these values of the controller gains.
7.3.18 Example
Consider a certain process described by the following transfer function:
7.3 Examples | 134
Find the specifications of a closed loop system without any controller. Next, assume Proportional Control and
find the controller gain such that the closed loop response has a steady state error no larger than 4%. Finally,
add the rate feedback to the controller scheme and find an appropriate Derivative gain such that the Percent
Overshoot is no more than 15%. Estimate what the resulting settling time would then be.

![이미지](images/page141_img00.webp)

7.3.19 Example
Let’s continue with the previous example. Assume that we have the same process transfer function, and that
the closed loop system will have the Rate Feedback, as well as Proportional Controller scheme. We would like
to have the Percent Overshoot equal to 15%, and the settling time (2% criterion) equal to 0.1 seconds. Find
appropriate values for both Controller gains, and estimate the resulting steady state error.
7.3.20 Example
Consider the block diagram below, describing a certain control system where a Proportional + Rate Feedback
control is implemented with two gains and .

![이미지](images/page141_img01.webp)

135 | 7.3 Examples
Find a closed loop system transfer function in terms of controller gains, and . Next, find the values of
gains and . such that the resulting Percent Overshoot of the closed loop step response will be equal to
15% and the settling time, , will be equal to 1.5 seconds. What is the closed loop transfer function
expression for the computed values of controller gains? For the computed values of controller gains, find the
closed loop system DC gain , and the closed loop steady state error for the step response, .
7.3.21 Example
Consider the block diagram below, describing a control system where the Proportional + Rate Feedback control
is implemented with two control parameters, K and and an inner feedback loop. Note that traditionally, to
denote a Rate (as well as a Derivative) Gain, two names are interchangeably used – Rate (or Derivative) Gain, and
Rate (or Derivative) Time Constant, which is the inverse of the Gain. Note as well that this is a slightly different P
+ Rate Feedback arrangement of components than the one in Example 7.3.20 (i.e. the inner feedback loop).

![이미지](images/page142_img00.webp)

First, find both closed loop system transfer functions in terms of controller parameters . Next, assume
the Disturbance signal to be zero and find their values such that the steady state error of the system step
response, , is equal to 10%, and the closed loop damping ratio equal to 0.7. For the calculated values
of controller parameters, estimate the resulting settling time of the step response, .
Next, assume that and where 1(t) is a unit step function. If K and are
as calculated above, what is the steady state value of the output signal, ? What will the steady state error
be? Repeat for and and What needs to be done to reduce the effect of the
disturbance on the system response? Explain briefly.
7.3.22 Example
7.3 Examples | 136
A feedback control system with positive controller gains and is configured as follows:

![이미지](images/page143_img00.webp)

Find an expression for in terms of in terms of so that the steady state error to a ramp (
), is less than 1 unit. Sketch the desired locations of the closed loop system poles in the complex plane in order
to achieve the following performance specifications:
• The damping ratio of the poles
• The settling time seconds.
Set the rate feedback gain and find the minimum value of the proportional gain so that all of
the performance specifications listed in Parts 1 and 2 can be achieved.
7.3.23 Example
Consider a closed loop position control system working under Proportional + Rate Feedback Control, as shown.

![이미지](images/page143_img01.webp)

137 | 7.3 Examples
Determine the Proportional Gain value such that the following performance specifications can be achieved:
the damping ratio of the poles and the settling time seconds. For the value of as
found above, estimate the following closed loop specifications:
. Also, determine the System Type, Error Constants and Steady State Errors.
Part 3. If the Proportional + Rate Feedback Control is replaced by the Proportional + Derivative Control, how
would the response specifications under P + D Control change, compared to your calculations in Part 2 for
Proportional + Rate Feedback?

![이미지](images/page144_img00.webp)

7.3.24 Example
Consider a closed loop control system working under a Proportional + Rate Feedback Control, as shown below:

![이미지](images/page144_img01.webp)

Find the controller gains such that the closed loop system will meet the following conditions:
• The closed loop operation is stable;
• The steady state error, in %, for a normalized step input, is equal to 5%;
• The closed loop step response has PO = 5%.
With the controller gain values as calculated, what will be the step response Settling Time (within 2%)?
7.3 Examples | 138
7.3.25 Example
Consider the same block diagram, shown below, as in Example 2.6.11, of the servo-control system for a position
control of one of the joints of a robot arm, operating under Proportional Control. Let’s assume a simplified
model for this system, shown below, where the armature inductance L = 0 H. All other parameters remain the
same as in Example 2.6.11.

![이미지](images/page145_img00.webp)

Find the closed loop transfer function between reference angle and the load position angle for the
simplified model of the system:
Next, find the value of the controller gain such that the closed loop system has the damping ratio
of. For this value of the controller gain, estimate Percent Overshoot, PO, of the system unit step response, Steady
State Error , and Settling Time, .
139 | 7.3 Examples
CHAPTER 8
Chapter 8 | 140
8.1 Systems with Delay
All real-life systems, particularly when subjected to large inputs, display some nonlinearities in their dynamics,
making it difficult to analyze them. Examples of such nonlinearities are: saturation, dead zone, and
transportational delays. You will see the effects of such real-life behaviours in the Lab Project dealing with
the positioning servo. Fortunately for us, in most systems operating within their normal range of inputs, the
nonlinearities can be ignored and for the purpose of their analysis and design, we can treat them as Linear and
Time Invariant (LTI). LTI systems are the systems where the Input-Output relationship is described by an ordinary
differential equation with no delayed time functions. In Laplace transform domain such systems are described
by transfer functions – ratios of s-polynomials.
While nonlinear systems are outside the scope of this course, we should acknowledge the fact that many
industrial systems may show a delay in their responses caused by a non-electrical nature of the system signals
(e.g. hydraulic, pneumatic, chemical, thermal etc.). Unlike for electrical systems which respond instantaneously,
a change required by a controller in a system with non-electrical dynamics does not occur the moment the
controller sends out the command signal. It will take a physically detectable amount of time for the non-
electrical variable to change, and for that change to register by the sensor.
For example, say, if a controlled variable is a volume of fluid, and the controller sends out a command to increase
the volume, that signal will be sent to an actuator (amplifier), which in turn will control the motor that will rotate
a valve to open and let more fluid through – there will be a delay before the increased volume is registered by
a sensor. This delay is called a Transportational Delay. The system is no longer an LTI system (i.e. Linear Time
Invariant) since the time delay introduces nonlinearity:
An example of a I/O description of a system without delay:
Laplace transform results in a transfer function:
Now consider a system with a transportational delay – the output signal will be zero for this amount of
time after the input is applied at t=0. Mathematically we can write this as:
Laplace transform of the delay function is and this equation becomes:
Note that the I/O relationship is no longer linear and if we were to consider such system within the scope of this
course, we would have to linearize the delay component first. This can be done by replacing the exponential
141 | 8.1 Systems with Delay
with an infinite Taylor series – theoretically we would be introducing an infinite number of poles and zeros. In
practice the series can be truncated, particularly if the delays are small, but in general the linearized system
dynamics will be higher than in an equivalent system without delay.
8.1 Systems with Delay | 142
8.2 Minimum Realizations and Reduced
Order Models - Part 1
Consider a certain process described by a block diagram below, where:

![이미지](images/page149_img00.webp)

Looking at the dynamics of the transfer functions, this is a 5th order process. Let’s find its transfer function:
The transfer function can be factored into a ZPK form as follows:
After pole-zero cancellation is performed (you can use MATLAB minreal function) we have:
Check the pole-zero map of the system – another near-cancellation is observed between the process pole at s
143 | 8.2 Minimum Realizations and Reduced Order Models -
Part 1
= -1.061 and the zero at s = -1.05. The process response is shown below – it looks exactly like a first order system
response, despite 5th order dynamics. Therefore we can build a first order model for this 5th order system:

![이미지](images/page150_img00.webp)

Note that the multiplier gain K of the system ZPK model should be adjusted so that the model DC gain is the
same as the DC gain of the original system:
In summary, when system parameters have such values that pole – zero cancellations occur, we can replace
the original system transfer function by its so-called minimum realization. In effect, the minimum realization is
model of the system that is of a lower order than the original system, yet, behaves in the same way.
We can also introduce a lower order, or reduced order, model when the pole-zero cancellation is not perfect.
Recall that while the zeros of a transfer function do not affect the shape of the system response, they decide
values of residues, i.e. magnitudes of each transient component. When a zero is close to a particular pole, the
magnitude of the transient associated with that pole will be very small and its contribution to the system
response can be ignored, resulting in a reduced order model.
MATLAB minreal function can perform pole-zero cancellations in the system transfer function that may not
be immediately obvious. As well, we can use this function to perform near-cancellations where the locations
of poles and zeros are not identical, but are close. If the cancellation is not perfect, it can be still performed by
8.2 Minimum Realizations and Reduced Order Models - Part 1 | 144
using the “tol” parameter of the minreal function. If the pole-zero cancellation was not perfect, it is important to
make sure that the DC gain of the reduced order model matches the DC gain of the original process.
145 | 8.2 Minimum Realizations and Reduced Order Models - Part 1
8.3 Dominant System Dynamics and
Reduced Order Models - Part 2
Responses of many industrial systems, even of a relatively higher order (which may be a result of linearization
of the transportational delay), exhibit closed loop responses similar to the systems we discussed in Chapter 6.1
(first order systems) and Chapter 7.1 (second order underdamped systems), or, less frequently, in Chapter 6.2
(second order overdamped systems). This may be because system parameters have such values that pole – zero
cancellations or near cancellations occur.
Or it may be because the system has some dominant dynamics – where several poles and zeros of the system
have a much larger effect on the system response – we say they “dominate it” – than other poles and zeros. By
ignoring the insignificant poles and zeros we can derive a reduced order model for the system behaviour.
One of your Computer Assignments deals with finding appropriate reduced order models to adequately
represent system dynamic responses. Recall that a real pole (i.e. located on the Real axis) will result in a transient
response that is an exponential where what we call the decay ratio is equal to the absolute value of the pole
coordinate on the Real axis, and is an inverse of the so-called time constant – see Equation 6‑2:
Also recall that a pair of complex poles (i.e. located away from the Real axis) will result in a transient response
that is an oscillation with an exponential envelope where the decay ratio is equal to the absolute value of the
real coordinate of the poles, and is an inverse of the so-called time constant – see Figure 7‑2 and Equation 7‑5:
Stable poles that are positioned close to the Imaginary axis will have short decay ratios , i.e. long time constants
and will take a long time to settle, while poles far away in the LHP will have much larger decay ratios , i.e. much
shorter time constants and will take a very short time to settle. Since the presence of such transients will only be
felt at the very beginning of the step response, their effect on the time specs (i.e. Rise Time, Peak Time – where
PO is measured, and Settling Time) can be safely ignored.
Figure 8‑1 shows the regions of dominant vs. insignificant system dynamics. Poles very far away in the LHP will
be “insignificant” while those very close to the Imaginary axis will be “dominant”.
8.3 Dominant System Dynamics and Reduced Order Models -
Part 2 | 146

![이미지](images/page153_img00.webp)

Figure 8-1 Regions of Dominant and Insignificant Poles/Zeros in the S-Plane
Of course, the question is – how do we decide the cut-off? The distance D separating the two regions shown
in Figure 8‑1 is subject to discussion and may change depending how tolerant our analysis/design is of
inaccuracies. Generally accepted rule is that D should be 6 to 10 times the magnitude of the dominant pole (or
of the real part of the dominant pair, in case of the complex poles.
To summarize, the system response is a superposition of the transient components where the shapes of
components are dictated by the location of dominant poles. Once the insignificant poles are discarded, we can
build a reduced order model for the system, based only on the dynamics of the dominant poles. The simplest
cases of the reduced order models are: one dominant real pole – the system can be modeled by a first order
model where a first order model as in Equation 6‑1, and a pair of dominant complex conjugate poles – the
system can be modeled by a second order underdamped model as in Equation 7‑1.
Classical Control takes particular interest in the second order underdamped model – if a closed loop response
of a certain control system can be modeled by it, we can derive, as we will see later in the course, some
relatively simple but effective control algorithms that depend on the parameters of this basic model described
by Equation 7‑1. Chapter 7 dealt in detail with the relationship between the model parameters ( )
and the quality of the system response (specifications such as PO, Settling Time, Rise Time and Errors). Later we
will be able to tie these parameters to the controller design.
147 | 8.3 Dominant System Dynamics and Reduced Order Models - Part 2
8.3 Dominant System Dynamics and Reduced Order Models - Part 2 | 148
8.4 The Effect of an Additional Pole on
the 2nd Order System Response
In cases where there are more than one or two poles close to the Imaginary axis, a standard second order
underdamped model will not be sufficient. The reduced order model may not be possible or it may require
an additional real pole, or an additional pair of the complex poles. What system response specifications are
affected by the presence of an additional real pole? The additional pole will contribute more damping to the
system response. This will reduce the Percent Overshoot, but at the same time it will slow the system response
increasing Rise Time and Settling Time. As an example, consider a plot of a step response of an unknown system
as shown in Figure 8‑2, and investigate if the standard second order model is appropriate.

![이미지](images/page155_img00.webp)

Figure 8-2 Effect of an Additional Pole – System Response
At the first glance, the second order model seems appropriate as the system is oscillatory. Let’s read off the PO
Settling Time and DC gain of the process: and .
149 | 8.4 The Effect of an Additional Pole on the 2nd Order
System Response
We can compute the corresponding damping ratio and then the frequency of natural oscillations:
The resulting model is:
Let’s plot the model response in Figure 8‑3, and compare it with the process response:

![이미지](images/page156_img00.webp)

Figure 8-3 Effect of an Additional Pole – First Attempt at Model
8.4 The Effect of an Additional Pole on the 2nd Order System Response | 150
This initial result is quite disappointing. While the Percent Overshoot and the Settling Time seem appropriate,
the frequency of oscillations is definitely too low. Let’s adjust to 6 rad/sec, as shown in Figure 8‑4. With the PO
and frequency of oscillations reasonably matched, the original system takes longer to settle and it is also visibly
lagging in rise time. Let’s try adjusting damping ratio to 0.17, as shown in Figure 8‑5.

![이미지](images/page157_img00.webp)

Figure 8-4 Effect of an Additional Pole – Second Attempt at Model
151 | 8.4 The Effect of an Additional Pole on the 2nd Order System Response

![이미지](images/page158_img00.webp)

Figure 8-5 Effect of an Additional Pole – Third Attempt at Model
Now, with the frequency of oscillations and the settling time reasonably matched, the model is much more
oscillatory – the original system exhibits more damping. The additional damping may be introduced by a real
pole that cannot be ignored. The presence of a third pole also slows down the rise time considerably. It is clear
now that the second order model is not appropriate here. Let’s assume a 3rd order model with an additional
real pole:
Equation 8-1
Note that in Equation 8‑1 the third pole magnitude a shows up also in the numerator so as not to change the DC
gain value. The value of a can be determined by trial and error. Since it is also dominant, let’s assume
as a reasonable starting point. The resulting 3rd order model would be:
8.4 The Effect of an Additional Pole on the 2nd Order System Response | 152
Figure 8‑6 shows the model response with a third pole added. The model seems to match the settling time and
frequency, but there is definitely a visible exponential transient which indicates that we chose the pole location
that is too close to Imaginary axis.

![이미지](images/page159_img00.webp)

Figure 8-6 Effect of an Additional Pole – Fourth Attempt at Model
After a few adjustments we have the final match for the transfer function, with a real pole at a = -5, with the plot
perfectly matched as shown in Figure 8‑7.
153 | 8.4 The Effect of an Additional Pole on the 2nd Order System Response

![이미지](images/page160_img00.webp)

Figure 8-7 Effect of an Additional Pole – Fifth Attempt at Model
8.4 The Effect of an Additional Pole on the 2nd Order System Response | 154
8.5 The Effect of an additional Zero on
the 2nd Order System Response
To make matters even more complicated, while the shapes of transients depend on the pole locations, zeros
of the transfer function decide about the magnitude of each component and thus also have an effect on the
system response. In Chapter 8.2 we learned that the magnitude of a particular transient component can be very
small and thus insignificant if a zero is near that pole location – a pole-zero near cancellation. When that is not
the case, the effect of a zero may be significant, depending on its location. Let’s assume that a standard second
order system has an additional zero at s = -a. The transfer function gain is adjusted to remain constant:
Equation 8-2
The transfer function in Equation 8‑2 can be considered as a sum of two components – the first component is
the standard second order model, but the second component has a derivative term in it – a zero is basically an
s-operator and as such it acts as a derivative on the response signal.
Now consider its effect on the system response to a unit step:
The above expression for the system response is again a superposition of two components: a step response
of the standard second order model, and a derivative of the same step response, but with a multiplier 1/a.
Depending on the magnitude of a, this component may be small or large. Thus if a is large, i.e. the zero is far
away in the LHP, the magnitude of this derivative term is insignificant and can be safely ignored. However, if
the zero is placed in the significant region close to the Imaginary axis, the magnitude of this signal component
rapidly increases. The superposition of a signal and its derivative creates a large “hump” in the system response,
in essence an exaggerated Percent Overshoot.
As an example, consider a second order overdamped system with poles at -5 and -3, and an additional zero at a
= -50
The plot of its step response is shown in Figure 8‑8, compared to the response of a system without the zero
added. Again predictably, based on Equation 8‑2 there is virtually no effect of the zero far in the insignificant
region on the system response, with the original system (i.e. the one with the zero) ever so slightly faster. If we
were looking for a simpler model for this system, the zero can safely be ignored:
155 | 8.5 The Effect of an additional Zero on the 2nd Order
System Response
Now, let’s see what happens when the zero is moved into the significant region close to the dominant poles, as
shown in Figure 8‑9 . Assume a = -2:
Notice that the settling time again is not affected. Conclusion – presence of a zero in the significant region in
the LHP (i.e. where the dominant poles of the system are), has a derivative effect on the system response. That
derivative effect results in a faster response but with an increased Overshoot. We would not be able to replace
the system dynamic with a simplified model – the zero has to be included in the system description.

![이미지](images/page162_img00.webp)

Figure 8-8 Effect of an Additional Zero in Overdamped System (Far Away)
8.5 The Effect of an additional Zero on the 2nd Order System Response | 156

![이미지](images/page163_img00.webp)

Figure 8-9 Effect of an Additional Zero in Overdamped System (Closer)
Next, consider a second order system with a pair of complex poles is:
and an additional zero at a = -50, as shown in Figure 8‑10,
compared to the response of a system without the zero added.
Predictably, based on Equation 8‑2 there is virtually no effect of the zero far in the insignificant region on the
system response, with the original system (i.e. the one with the zero) ever so slightly faster. If we were looking
for a simpler model for this system, the zero can safely be ignored.
Now, let’s see what happens when the zero is moved into the significant region close to the dominant poles.
Assume a =-5. Plots are shown in Figure 8‑11.
As in the case of an overdamped system, the magnitude of the derivative term in Equation 8‑2 is much larger
157 | 8.5 The Effect of an additional Zero on the 2nd Order System Response
now. As a result, the system response is much faster (shorter Rise Time), while the Percent Overshoot is much
worse (larger). The frequency of oscillations and Settling Time are not affected. We would not be able to replace
the system dynamic with a simplified model – the zero has to be included in the description.

![이미지](images/page164_img00.webp)

Figure 8-10 Effect of an Additional Zero in Underdamped System (Far Away)
8.5 The Effect of an additional Zero on the 2nd Order System Response | 158

![이미지](images/page165_img00.webp)

Figure 8-11 Effect of an Additional Zero in Underdamped System (Closer)
159 | 8.5 The Effect of an additional Zero on the 2nd Order System Response
8.6 The Effect of a Non-Minimum Phase
Zero on the 2nd Order System Response
Let us consider a special case of a system with a zero in the RHP. Note that such case has nothing to do with
the system stability, as the stability is decided by the locations of poles only. A zero in the RHP is called a non-
minimum phase zero (what follows is that the zero in the LHP is called a minimum-phase zero, to distinguish
between the two). The name refers to the phase characteristics of the two singularities, as shown in Figure 8‑12
and in Figure 8‑13.

![이미지](images/page166_img00.webp)

Figure 8-12 Frequency Response of a Minimum Phase Zero (in LHP)
Physical systems typically have several poles, each contributing a negative phase angle going from 0 degrees
to -90 degrees as the frequency increases, and only one or two zeros. An LHP zero contributes positive phase
angle going from 0 degrees to +90 degrees as the frequency increases. Thus the effect of the LHP zero in the
frequency domain is that the overall negative phase, or phase lag, decreases. In contrast, an RHP zero has a
8.6 The Effect of a Non-Minimum Phase Zero on the 2nd
Order System Response | 160
phase characteristic that is the opposite of the LHP zero, contributing a negative phase angle going from 0
degrees to -90 degrees as the frequency increases. Thus, the effect of the RHP zero in the frequency domain is
that the overall negative phase, or phase lag, increases. When comparing two systems, one with the LHP zero,
and one with the RHP zero, the overall phase angle characteristic of the latter one will be more negative than of
the former one, hence the name, non-minimum phase. See an example in the next section for such comparison.

![이미지](images/page167_img00.webp)

Figure 8-13 Frequency response of Non-Minimum Phase Zero (in RHP)
Let us examine the effect of the RHP zero on the system transient response. Let’s assume that a standard
second order system has an additional RHP zero at s = +a. The transfer function gain is adjusted to remain
constant:
Equation 8-3
As before, the transfer function in Equation 8‑3 can be considered as a sum of two components – the first
component is the standard second order model, and the second component acts as a derivative on the
response signal. However, because the zero was in RHP, the magnitude of this component is negative.
Now consider its effect on the system response Y(s) to a unit step:
161 | 8.6 The Effect of a Non-Minimum Phase Zero on the 2nd Order System Response
The above expression for the system response is again a superposition of two components: a step response of
the standard second order model, and a derivative of the same step response, but with a negative multiplier
1/a. Depending on the magnitude of a, this component may be small or large. Thus if a is large, i.e. the zero is
far away in the RHP, the magnitude of this negative derivative term is insignificant and can be safely ignored.
However, if the RHP zero is close to the Imaginary axis, the magnitude of this negative signal component rapidly
increases. The superposition of a signal and its negative derivative creates not only an exaggerated Percent
Overshoot, but also an initial negative “dip” in the system response. Such dip is a tell-tale sign of a significant
RHP zero. The zero cannot be ignored and has to be included in the system model.
Note that the presence of the non-minimum zero presents a control problem, because systems exhibiting non-
minimum phase characteristics are difficult to improve on. The negative dip creates an effective time delay,
thus increasing the rise time and the settling time. However, this issue cannot be easily addressed with Classic
Control approaches – a good controller will reduce oscillations and shorten the settling time, but the effective
lag will remain. Let’s consider a second order overdamped system with poles at -5 and -3, and an additional zero
at a = +50:
The plot of its step response is shown in Figure 8‑14, compared to the response of a model without the zero.
Again predictably, based on Equation 8‑2 there is virtually no effect on the system response of the zero far in the
insignificant region (i.e. in the far positive magnitudes of RHP). If we were looking for a simpler model for this
system, the zero can safely be ignored:
Now, let’s see what happens when the zero is moved into the significant region close to the dominant poles.
Assume a = +2. The plot is shown in Figure 8‑15. The magnitude of the negative derivative term in Equation 8‑2
is now much larger. This will cause a very visible “dip”, or “Undershoot“, at the beginning of the system response
– the initial response initially goes negative. In some systems the change of polarity may not be acceptable, in
others the problem is the effective delay created by the polarity reversal.
As a result of the delay, the Rise Time and Settling Time will be longer (worse). We would not be able to replace
the system dynamic with a simplified model – the RHP zero has to be included in the description. Note that
this “Undershoot” effect is a mirror image of what happens with a significant zero in the LHP in an overdamped
system where an “artificial” Percent Overshoot was formed. Next, consider a second order system with a pair of
complex poles is: , , and an additional zero at a = +50:
The plot of its step response is shown in Figure 8‑16, compared to the response of a system without the zero
added. Predictably, based on Equation 8‑2 there is virtually no effect on the system response of the zero far in
the insignificant region, with the Undershoot and the resulting delay almost invisible. Note that when a zero is
in an insignificant region, it doesn’t matter that the zero is in the RHP – instead of far to the left, as in LHP, the
8.6 The Effect of a Non-Minimum Phase Zero on the 2nd Order System Response | 162
insignificant region will be far to the right, tending towards positive large magnitudes. If we were looking for a
simpler model for this system, the zero can safely be ignored:
Now, let’s see what happens when the zero is moved into the significant region i.e. close to the Imaginary axis.
Assume a = +5. The plot of its step response is shown in Figure 8‑17, compared to the response of a system
without the zero added.
The magnitude of the negative derivative term in Equation 8‑2 is now much larger. This will cause a very visible
Undershoot, or a dip, at the beginning of the system response – the initial response goes negative. As a result of
the delay, the Rise Time and Settling Time will be longer (worse). The Percent Overshoot is again much worse
(larger), as in the case of the zero in the LHP. The frequency of oscillations is not affected. We would not be able
to replace the system dynamic with a simplified model – the RHP zero has to be included in the description.

![이미지](images/page169_img00.webp)

Figure 8-14 Effect of an Additional RHP Zero in Overdamped System (Far Away)
163 | 8.6 The Effect of a Non-Minimum Phase Zero on the 2nd Order System Response

![이미지](images/page170_img00.webp)

Figure 8-15 Effect of an Additional RHP Zero in Overdamped System (Closer)
8.6 The Effect of a Non-Minimum Phase Zero on the 2nd Order System Response | 164

![이미지](images/page171_img00.webp)

Figure 8-16 Effect of an Additional RHP Zero in Underdamped System (Far Away)
165 | 8.6 The Effect of a Non-Minimum Phase Zero on the 2nd Order System Response

![이미지](images/page172_img00.webp)

Figure 8-17 Effect of an Additional RHP Zero in Underdamped System (Closer)
8.6 The Effect of a Non-Minimum Phase Zero on the 2nd Order System Response | 166
8.7 Examples
8.7.1 Example
Consider a closed loop system with the DC gain of 0.8 and the following closed loop pole locations: ,
, . Decide if a reduced order model is appropriate for this system.
8.7.2 Example
A certain LTI system is described as having four poles and one zero, as follows: , ,
, , . It is also recorded that the system has a DC gain of 5. Write the complete
transfer function of the system in a ZPK form. Note the multiplier gain K in the ZPK form is NOT the same as
the DC gain! Is it appropriate to use a simplified, 2nd order representation for this system? If so, please write the
second order transfer function of this model, as well as its parameters (i.e. , , ).
8.7.3 Example
Consider a transfer function of a certain industrial process, described as follows:
Can a second order dominant poles model be used to represent this process? If so, explain why by sketching
below a pole-zero map of G(s). Next, calculate the appropriate model parameters , , and and then write
the transfer function of the model, .
8.7.4 Example
Consider a control system as shown:
167 | 8.7 Examples

![이미지](images/page174_img00.webp)

When the Proportional Controller gain is K = 33, the closed loop system has the following poles: -7.1164, -4.4199,
and a zero at -4. Briefly discuss if it is appropriate to model the closed loop system
behaviour by using the standard second order system, and if so, derive the model parameters and write its
transfer function .
NOTE: This example can be easily solved with access to Matlab. Howver, given the information provided, it can
also be solved without any complicated polynomial manipulations. Use Matlab to check on your results.
8.7.5 Example
Consider the two responses shown. One is the response of a third order closed loop system with a dominant
pair of complex poles and an additional real pole, the other is the response of a second order model based on
the dominant pair of system poles. Match the responses with the plots.
8.7 Examples | 168

![이미지](images/page175_img00.webp)

8.7.6 Example
Consider the three figures on the following page – each shows two responses, to a unit reference signal, of
two closed loop control systems. One response, identical in each figure, is of a second order system with two
complex conjugate poles. The second response in each figure has the same two complex conjugate poles and
an additional singularity, i.e. either a pole or a zero. For each of the figures, finish the following sentence:
The second order system with two complex poles is trace # _______
Next, for each figure, choose which of the following answers applies to this case:
The other system has two complex poles and a significant real LHP pole
The other system has two complex poles and a significant real LHP zero
The other system has two complex poles and a significant real RHP pole
The other system has two complex poles and a significant real RHP zero
169 | 8.7 Examples
Figure A.

![이미지](images/page176_img00.webp)

Figure B.
8.7 Examples | 170

![이미지](images/page177_img00.webp)

Figure C.
171 | 8.7 Examples

![이미지](images/page178_img00.webp)

8.7.7 Example
Consider a certain closed loop control system, which is TYPE ONE. It is a second order system with two complex
conjugate poles located at: . Write its transfer function.
Consider a certain closed loop control system, which is TYPE ONE. It is a second order system with two complex
conjugate poles located at: and a zero at -15. Write its transfer function.
Consider a certain closed loop control system, which is TYPE ONE. It is a second order system with two complex
conjugate poles located at: and a zero at +15. Write its transfer function.
Consider a certain closed loop control system, which is TYPE ONE. It is a third order system with two complex
conjugate poles located at: and a pole at -15. Write its transfer function.
8.7.8 Example
Consider a step response of a system as shown below. Choose which system description matches this response:
8.7 Examples | 172
• Two complex poles at: -1–j4.9, -1 +j4.9 and gain K = 5;
• Two complex poles at: -1–j4.9, -1 +j4.9, zero at -5 and gain K = 5
• Two complex poles at: -1–j4.9, -1 +j4.9, zero at -5 and gain K = -5
• Two complex poles at: -1–j4.9, -1 +j4.9, zero at +5 and gain K = 5
• Two complex poles at: -1–j4.9, -1 +j4.9, zero at +5 and gain K = -5

![이미지](images/page179_img00.webp)

8.7.9 Example
Consider a certain closed loop control system under Proportional Control, as shown.
173 | 8.7 Examples

![이미지](images/page180_img00.webp)

Assume the Controller gain to be , calculate a transfer function of the closed loop system and
determine the closed loop system damping ratio, , the closed loop frequency of natural oscillations,
and the closed loop DC gain, . Estimate the closed loop system transient and steady state response
specifications.
Next, replace the Proportional Controller with a Lead Control as shown and find values of the controller
parameters, , , such that the closed loop system has a dominant pair of complex poles with the
frequency of damped oscillations equal to 2 rad/sec, and the corresponding time constant of 1 second, and a
third real pole with the corresponding time constant of 0.05 seconds.

![이미지](images/page180_img01.webp)

Find the closed loop transfer function of the compensated system, and estimate the transient
and steady state response specifications for the compensated system.
Consider step response plots shown next. One of the responses shown is the response of the system
8.7 Examples | 174
compensated according to instructions above, i.e. , while the other one is the response of the system
described by:
Label the two traces on the plot (i.e. Trace A and Trace B), by indicating which trace corresponds to which
transfer function. Provide a brief explanation of why that is.

![이미지](images/page181_img00.webp)

8.7.10 Example
Consider a certain closed loop control system which is supposed to work under so-called Lead Controller:
175 | 8.7 Examples

![이미지](images/page182_img00.webp)

Find values of the controller parameters, , , such that the closed loop system has a dominant pair
of complex poles with the frequency of damped oscillations equal to 9 rad/sec, and the corresponding time
constant of 0.5 seconds, and a third real pole with the corresponding time constant of 25 miliseconds. Find
the closed loop transfer function of the compensated system, . Next, consider now two step
response plots shown below. One of the responses shown is the response of the system compensated
according to instructions above, i.e. , while the other one is the response of the system described by the
transfer function , described below.
8.7 Examples | 176

![이미지](images/page183_img00.webp)

Label the two traces on the plot (i.e. Trace A and Trace B), by indicating which trace corresponds to which
transfer function. Provide a brief explanation of why that is. Finally, consider now two step response plots shown
next. One of them corresponds to the Lead compensated closed loop system that has three poles and one zero,
and the other corresponds to a system described by a second order model by the transfer function
below that has only two poles. Explain briefly why this model fits the compensated system so well.
177 | 8.7 Examples

![이미지](images/page184_img00.webp)

8.7.11 Example
Consider the following block diagram, where a Proportional + Integral Controller is implemented in the forward
path, with a Derivative Control implemented as a Rate Feedback in an inner feedback loop, as shown.
8.7 Examples | 178

![이미지](images/page185_img00.webp)

Derive the closed loop transfer function, , in terms of the controller parameters, , and
. It is desired that the closed loop system step response has a zero steady state error, percent overshoot of
15% and the settling time (±2% criterion) of 1 second. Use the “top-down” design to find appropriate controller
parameters.
HINT: Assume that has the closed loop system has two dominant poles with a damping ratio and the natural
frequency corresponding to the desired step response specification, and that the third closed loop pole is
at a location ten (10) times further to the left of the s-plane than the Real Part of the dominant poles pair.
Once you design your controller, discuss whether the system response is going to be exactly as expected. If not,
explain why, and what the differences might be.
8.7.12 Example
Consider again the block diagram in Example 7.3.20, describing a certain control system where a Proportional
+ Rate Feedback control is implemented with two gains and . Replace the P + Rate Feedback Control
with PD Control, using the same gain values as in Example 7.3.20:
179 | 8.7 Examples

![이미지](images/page186_img00.webp)

Given the two responses shown next, which one corresponds to the system under P + Rate Feedback, and which
one to the system under PD Control?

![이미지](images/page186_img01.webp)

Assume now that the proportional gain in Example 7.3.20 has been replaced by a P+I controller with the
transfer function , while the Rate Feedback gain remains as in Example 7.3.20. Briefly discuss what
8.7 Examples | 180
the effect of this new controller will have on the system response, in terms of its steady state error, percent
overshoot, and rise time.

![이미지](images/page187_img00.webp)

8.7.13 Example
Consider the same block diagram as in the previous two examples, describing a certain control system where a
Proportional + Rate Feedback control is implemented with two gains and . Recall that the conclusion in
the first example was that the Proportional + Rate Feedback control can meet exactly either the specifications
for the Percent Overshoot and the Settling Time, or for the Percent Overshoot and the Steady State Error, but
not for all three. Now, add the Integral term in series with the Proportional Gain, as shown in the diagram in
the second example, and see if the exact values of the required PO, the required Settling Time and the required
Steady State Error can be met: PO = 15% , seconds and .
8.7.14 Example
Consider again the system from Example 7.3.17, describing a certain system under Proportional + Rate Feedback
Control. We found the closed loop system transfer function for this system in terms of controller gains and
and we determined values of the controller gains such that PO = 10% and Settling time (within ) = 1
second. These gain values were: and .
Now, let’s consider a modified version of this system, with the same process transfer function G(s), but now the
closed loop position control system works under Proportional + Integral + Rate Feedback Control, as shown next.
Find the closed loop system transfer function in terms of controller gains and and . Rewrite this
transfer function using values of gains and as calculated in Example 7.3.17 so that your transfer function
will only have one variable gain, .
181 | 8.7 Examples

![이미지](images/page188_img00.webp)

Next, consider the following three transfer functions , and that correspond to three
specific values of the Integrator gain :
The graph below shows the step responses to a unit reference of the three transfer functions:
8.7 Examples | 182

![이미지](images/page189_img00.webp)

Identify the numerical value of the Integrator gain that corresponds to each transfer function and then match it
with one of the three traces shown in the plot. How did you match plots with transfer functions and gain values?
Explain briefly.
If the P+Rate Feedback Controller from Example 7.3.17 and one of the the PI+Rate Feedback Controllers in this
example both meet these specs: PO = 10% and Settling time (within ) = 1 second, is PI+Rate a better
controller? If yes, briefly explain why? If no, briefly explain why.
8.7.15 Example
Consider a feedback system under PID Control as shown. Your task is to calculate the PID Controller parameters.
To do so, please follow the steps described in the following parts.
183 | 8.7 Examples

![이미지](images/page190_img00.webp)

We want the compensated closed loop response of our control system to resemble the response of a standard
second order under-damped model that is shown below. Determine appropriate parameters of the model (i.e.
, , ). Write the parameters as well as the model transfer function.

![이미지](images/page190_img01.webp)

8.7 Examples | 184
Derive the closed loop transfer function, , in terms of the controller parameters, , , and
. Find appropriate controller parameters. HINT: Assume the dominant poles model for the closed loop system
based on the model derived in Part 1 and use a factor of 10 times for any additional poles to be placed in the
insignificant region. Substitute the computed values of the controller parameters, , , and into the
closed loop transfer function, and write the numerical values of its poles and zeros, as well as
the DC Gain of the compensated closed loop. Sketch a Pole-Zero Map for this transfer function. Based on the
Pole-Zero Map, discuss briefly whether the actual compensated system response will differ from the expected
model response, and if so, describe in what way. Try to be brief but specific.
8.7.16 Example
Consider a closed loop positioning control system with a PID Controller in a so-called “series” configuration, as
shown:

![이미지](images/page191_img00.webp)

Derive the Closed Loop system transfer function in terms of Controller Gains , , and and write
the system Characteristic Equation, . The compensated Closed Loop step response of this system
is to have the following specifications: and sec. Determine the Closed
Loop system damping ratio, , and the frequency of natural oscillations, , to meet the transient response
requirements.
Choose the pole locations for the Closed Loop system so that system two complex conjugate (“dominant”) poles
correspond to the desired second order model (above) and the third real pole equals to the value of Integral
Gain so that a pole-zero cancellation in the Closed Loop transfer function occurs. Compute the required
Controller gains , and . Note that you are expected to solve a quadratic equation to find the gains in
item 3), which means you will have two sets of solutions. Choose ONLY ONE set for your final answer – clearly
identify it, and justify your choice by briefly commenting on any possible differences between the expected
system responses (i.e. of the dominant poles model) and the actual system responses.
185 | 8.7 Examples
8.7.17 Example
Consider again the same configuration as in Example 8.7.16, where the transfer function of the process is:
The compensated Closed Loop step response of this system is to have the following specifications:
and sec. Determine the Closed Loop system damping ratio, , and the
frequency of natural oscillations, , to meet the transient response requirements.
Choose the pole locations for the Closed Loop system so that system two complex conjugate (“dominant”)
poles correspond to the desired second order model (above) and the third real pole equals to the value of
Integral Gain so that a pole-zero cancellation in the Closed Loop transfer function occurs. Compute the
required Controller gains , , and . Note that you are expected to solve a quadratic equation to find
the gains in item 3), which means you will have two sets of solutions. Choose ONLY ONE set for your final
answer – clearly identify it, and justify your choice by briefly commenting on any possible differences between
the expected system responses (i.e. of the dominant poles model) and the actual system responses. Suggest
possible improvements.
8.7.18 Example
Consider a closed loop positioning system working under Proportional + Integral + Rate Feedback Control, as
shown below.

![이미지](images/page192_img00.webp)

Derive the Closed Loop system transfer function in terms of Controller Gains , , and and write
the system Characteristic Equation, . Next, the compensated Closed Loop step response of this
8.7 Examples | 186
system is to have the following specifications: and sec. Determine the Closed
Loop system damping ratio, , and the frequency of natural oscillations, , to meet the transient response
requirements.
Next, choose the pole locations for the Closed Loop system so that system two complex conjugate (“dominant”)
poles correspond to the desired second order model (above) and the third real pole equals to the value
of Integral Gain so that a pole-zero cancellation in the Closed Loop transfer function occurs. Compute the
required Controller Gains , , and . Note that you are expected to solve a quadratic equation to find the
gains in item 3), which means you will have two sets of solutions. Choose ONLY ONE set for your final answer –
clearly identify it, and briefly justify your choice.
8.7.19 Example
Consider a closed loop unit feedback control system with a process transfer function as follows:
The system is to work either under a Proportional + Derivative (PD) Control or under a Proportional + Rate
Feedback, both shown next. The closed loop transfer functions of both systems are already derived in terms of
Controller parameters and , and shown.

![이미지](images/page193_img00.webp)

187 | 8.7 Examples

![이미지](images/page194_img00.webp)

The closed loop transfer function of the system under PD Control can be derived as follows:
The closed loop transfer function of the system under P + Rate Feedback Control Control can be derived as
follows:
We would like the closed loop transfer function to resemble a second order model with the following
parameters: DC Gain, , the damping ratio, , and the frequency of natural oscillations, . The model is described by
the transfer function below:
In order for that to be true, any additional poles and zeros of the closed loop would have to be placed in the
“insignificant region” of the S-plane. Show why it is not possible to implement a PD Controller with a third
closed loop pole at the exact location of so that a perfect pole-zero cancellation in the closed loop transfer
function could take place. Next, consider that the closed loop step response is to have a Percent
Overshoot of 10% and the Settling Time ( ) equal to 0.8 seconds. Show why it is not possible to
implement a P + Rate Controller where we would have the dominant complex poles so that the above specs
are met, and a third closed loop pole at the location that is 10 times further to the left of the S-plane than the
location of the dominant complex poles, i.e. in the insignificant region.
While it is not possible to have all three conditions from Part 2 met, it is possible to find the P + Rate Controller
parameters and such that the PO = 10%, and the third pole of the closed loop system is 10 times further
to the left of the S-plane than the location of the dominant complex poles, i.e. in the insignificant region.
Compute the Controller parameters and , then find the resulting natural frequency and estimate the
resulting Settling Time ( ) of the compensated closed loop step response.
8.7 Examples | 188
8.7.20 Example
Consider a closed loop control system working in a feedback configuration under Proportional + Rate Feedback
Control, shown in Figure below:

![이미지](images/page195_img00.webp)

Determine the value of the Proportional Gain, , such that the closed loop step response will have a Steady
State Error of 5%. Next, determine an APPROXIMATE value of the Rate Feedback Gain, , such that the closed
loop step response will have a Percent Overshoot of 15%. HINT: Make a simplifying assumption based on the
Dominant Poles Model to arrive at this estimate.
Next, determine the ACCURATE value of the Rate Feedback Gain, , such that the closed loop step response
will have a Percent Overshoot of 15%. Note that you are solving only a quadratic equation. Finally, compare the
two values of the Rate Feedback Gain, , (i.e. the approximate and the accurate value) and comment on
whether the simplifying assumption you made in the previous item is valid, and on how much difference, if
any, using the approximate value would make. You may want to refer to the pole-zero map of the compensated
closed loop system to make your argument.
8.7.21 Example
Consider a unit feedback control system where the process is a first order transfer function G(s), and the
Controller transfer function is described below as :
Derive the closed loop transfer function, , in terms of the controller parameters, , , and ,
and write the system Characteristic Equation, .
189 | 8.7 Examples
Assume that the closed loop system response can be approximated using a second order dominant poles
model. The compensated closed loop step response of this system is to have the following specifications:
Percent Overshoot, , Settling Time, sec, and Steady State Error,
. Identify an appropriate model, , that would meet these specifications.
Next, find controller parameters ( , , and ) and identify the nature of the controller i.e. is it a PD, PI, PID,
Lead or Lag Controller.
Briefly describe how the actual closed loop system response would compare with the model response.
8.7.22 Example
Consider the closed loop control system with a relatively slow hydraulic process under a modified PID Control,
with Rate Feedback replacing the Derivative term, as shown in the diagram next.

![이미지](images/page196_img00.webp)

The desired step response specifications are as follows:
• Percent Overshoot,
• Settling time within 2% of the steady state value, seconds
• Steady State Error,
Your task is to calculate the PID Controller parameters, , , and so that the above specifications are
met. In order to do so, follow the steps outlined next.
Find the closed loop transfer function, , in terms of controller gains , , and . Choose the
location for the two dominant poles of the closed loop based on a standard second order dominant poles
model. Compute model parameters , , as appropriate, given the time response specifications.
Find the controller gains , , and so that the design benefits from a pole-zero cancellation, thus
8.7 Examples | 190
resulting in a closed loop transfer function identical to that of the above model, i.e. . HINT:
This can be accomplished by placing the third closed loop pole at the EXACT location of the closed loop zeros
from above. What is the resulting Steady State Error to a unit ramp reference signal?
Next, consider the same closed loop control system and the same transient requirements, but now it is also
required that the compensated closed loop response tracks the unit ramp with the steady state error equal to
0.2 units (e_{ss(ramp)}=0.2).Check your calculations in item 4) to determine which controller gain is responsible
for the steady state ramp error, and calculate the value of that gain so that the error condition is met.
Since the ramp steady state error will pre-determine one of the controller gains (see above), we can no longer
impose the perfect pole-zero cancellation requirement on the design. Therefore assume that the third closed
loop pole is at location s = -a, which needs to be determined, together with the two remaining controller gains.
Find the value of as well as of the two gains. The first design uses a pole-zero cancellation so its response is
expected to be exactly like the response of a second order system. Check off in the tables below how different
the response of the second design is, based on where its poles and zeros are and briefly explain why?
Higher? Lower? The Same?
Percent Overshoot
Rise Time
Steady State Error for a step
reference
Steady State Error for a ramp
reference
8.7.23 Example
Consider again a unit feedback closed loop control system from Example 8.7.10, where the process transfer
function was described below as G(s), and the Controller transfer function was a Lead Controller.
Derive the closed loop transfer function, , in terms of the controller parameters, , , and
, identify the closed loop characteristic equation. It is required that the compensated closed loop step
response of this system have the following specifications: Percent Overshoot, , Settling Time,
sec, and Steady State Error, . Use the “Top-Down” design approach to
identify the required closed loop characteristic equation that would meet the specifications, and find
appropriate controller parameters, , , and . Write the required closed loop characteristic equation,
controller parameters and its transfer function, , and identify the nature of the controller (i.e. is it PD, PI,
PID, Lead or Lag Controller).
HINT: Assume that has the closed loop system has two dominant poles with a damping ratio and the natural
frequency corresponding to the desired step response specification, and that the third closed loop pole is
at a location ten (10) times further to the left of the s-plane than the Real Part of the dominant complex poles.
Figure shown next shows a comparison of the step responses to a unit reference – these are the
uncompensated closed loop step response, compensated closed loop step response and 2nd order dominant
pair model step response. Identify the traces on the plot, i.e. match each trace label with the correct description.
191 | 8.7 Examples

![이미지](images/page198_img00.webp)

8.7.24 Example
Consider again the positioning system from Example 3.3.13, shown next. The transfer functions and
were derived and the numerical values substituted:
The system output was: . For the resulting system transfer
function , estimate the following closed loop step response specifications: – steady step error
in % to a normalized unit step input, P.O. – Percent Overshoot, and – settling time.
Next, assume K = 1; if the reference speed signal is and , what is the output
speed? With the same reference, if the torque disturbance signal is , what is the output
speed change in ?
8.7 Examples | 192

![이미지](images/page199_img00.webp)

Next, calculate the required Proportional Gain K to achieve . For that value of K, estimate
the resulting P.O. and . If the reference speed signal is and
, what is the output speed? With the same reference and gain K, if the torque disturbance signal is
, what is the output speed change in ?
193 | 8.7 Examples
CHAPTER 9
Chapter 9 | 194
9.1 Introduction
One of the most versatile controller configurations for simple single feedback loop control is a PID Controller.
We already became familiar with the various forms of this controller both in the Lab as well as in two previous
Chapters, where we utilized the “Top-down” design approach to finding the controller gain values, based on the
understanding of the second order model and the effects of additional poles and zeros on the system response.
In this Chapter we will further discuss the properties of the three-mode controller (PID), including some of its
practical aspects.

![이미지](images/page201_img00.webp)

Figure 9-1: Basic Unit Feedback Closed Loop System under PID Control (Parallel Structure)
The three-mode-controller name (PID) stands for Proportional + Integral + Derivative. Its parallel configuration
is realized as follows:
Equation 9‑1
where e(t) is error, and u(t) is the Controller output, actuating the Process. Equation 9‑1 represents the so-called
Parallel PID Structure, where the three modes of controller operation are added – the controller output is a sum
of the three control channels: P, I and D. The parallel structure is very easily implemented digitally. This form
is also very convenient for intuitive, step-by-step controller tuning where each mode is added independently.
For more on PID tuning, see appendices in Lab 2. The tuning approach, unlike the more analytical “top-down”
design approach, does not guarantee the “best possible” combination of parameters, but it provides a good
starting point for an analytical design where Root Locus Analysis or Frequency Response Analysis (more on
Frequency Response to come in Chapter 12) are considered.
A variation of the Parallel Structure is also used, shown Figure 9‑2, with the Proportional Controller Gain as a
multiplier – it is more useful when Root Locus Analysis is used (more on Root Locus to come in Chapter 10), as
we can vary the Proportional Gain – this is not possible for the classical Parallel Structure of Equation 9‑1.
195 | 9.1 Introduction

![이미지](images/page202_img00.webp)

Figure 9-2: Basic Unit Feedback Closed Loop System under PID Control
However, the problem with the Parallel PID Structure is that the zeros of the closed loop transfer function,
shown in Equation 9‑1, interact, since they are solutions of a quadratic term – when one zero location is changed
(i.e. the value of one of the time constants is changed), the other zero moves as well.
Therefore, for a more analytical approach (i.e. if we want to use the Root Locus, or Frequency Response plots to
design the PID Controller) this form is not so convenient: the two zeros interact, shifting at the same time. An
alternative configuration of the PID Controller can be implemented, called the Series PID Controller Structure,
shown in Figure 9‑3 and in Equation 9‑2. The zeros of the closed loop transfer function are now independent
and can be moved on the Root Locus or on the Frequency Response plot one at a time.

![이미지](images/page202_img01.webp)

Figure 9-3 Series PID Controller Structure
Equation 9-2
Finally, when the Series PID structure is divided into two terms, one in the forward path and one in the feedback
path, we have the PI + Rate Feedback structure as shown in Figure 9‑4.
Both the Parallel and the Series PID Structures have two zeros, and therefore contribute these two zeros to
9.1 Introduction | 196
the closed loop transfer function. In case of the PI + Rate Feedback, only one zero is contributed to the closed
loop transfer function. The PI + Rate Feedback Structure can be used if the Derivative effect has to be reduced
because either we have a large additional overshoot in the step response because the system zeros are in the
dominant region, or a wind-up effect is taking place, or when we are dealing with a noisy environment, since
the Bandwidth of the system with only one zero is smaller than the Bandwidth of the system with two zeros and
thus the configuration with the Rate Feedback provides more attenuation for noise, which is usually a higher
frequency phenomenon.

![이미지](images/page203_img00.webp)

Figure 9-4 PI + Rate Feedback Controller Structure
In general, when dealing with a system under PID Control, we take the following steps:
• Obtain a closed loop system that is stable
• Exert a reasonable level of control signal to the process – the Proportional Controller does most of the
work. Proportional Mode is the “work-horse”, or the “muscle”, of the PID Controller. Proportional Mode is
used to provide stable, fast and accurate response.
• Integral and Derivative Gains should be used sparingly, to make subtle adjustments in the system
response:
◦ o Integral Mode increases the System Type and therefore reduces the steady state error – PI
(Proportional + Integral) Control is used to improve steady state tracking.
◦ o Derivative Mode is used to increase damping – PD (Proportional + Derivative) Control is used to
increase damping and therefore to decrease oscillations and also to speed up the system response.
• Fine-tune as required during implementation by adding the Integral and Derivative action.
An important observation about the PID Control – the Integral and Derivative action should be used sparingly!
A nice analogy for the Controller settings is to think about the Proportional Control as a main meal, while the
Integral and the Derivative are like salt and pepper – while these condiments are needed to have a tasty meal,
too much of either will spoil the taste.
The basic control actions in a PID Controller are as follows:
197 | 9.1 Introduction
• Proportional Control
• PI (Proportional + Integral) Control
• PD (Proportional + Derivative) Control (or its variation, Proportional + Rate Feedback)
• PID (Proportional + Integral + Derivative) Control
Plots shown next show the effects of the actions of each Controller Mode. Figure 9‑5 shows a screen capture of
a Java Applet where a typical closed loop system response to Proportional Control is shown – steady state error
vs. oscillation tradeoff takes place as the gain is increased.

![이미지](images/page204_img00.webp)

Figure 9-5 Proportional Control
Figure 9‑6 shows the effect of PI Control, with the steady state error integrated to zero. Figure 9‑7 shows the
effect of PD Control which has no effect on the steady state, but reduces oscillations in the transient state.
Finally, Figure 9‑8 shows the effect of a well-tuned PID Controller.
9.1 Introduction | 198

![이미지](images/page205_img00.webp)

Figure 9-6 Proportional + Integral Control
199 | 9.1 Introduction

![이미지](images/page206_img00.webp)

Figure 9-7 Proportional + Derivative Control
9.1 Introduction | 200

![이미지](images/page207_img00.webp)

Figure 9‑8 PID Control
201 | 9.1 Introduction
9.2 Proportional Control
Figure 9‑9 shows a basic closed loop configuration with proportional Controller.

![이미지](images/page208_img00.webp)

Figure 9-9 Basic Unit Feedback Closed Loop System under P Control
We looked at the operation of the closed loop system under Proportional Control before, so this is just a recap.
Consider an example where the process transfer function is as follows:
Equation 9-3
The closed loop system transfer function is then calculated as:
Equation 9-4
The critical gain can be calculated from Routh-Hurwitz Criterion as and the resulting frequency
of marginal oscillations is calculated as rad/sec. Figure 9‑10 shows the effect of Proportional
Control on the closed loop step response of this system – when the controller gain is increased, we see a
tradeoff between better steady state tracking and worsening transient response and corresponding reduction
in the system relative stability (Gain Margin is reduced as gain increases). Working with high gain values is not
satisfactory as well because of real-life effects such as possible controller output saturation which makes the
control less effective as the system is no longer linear.
9.2 Proportional Control | 202

![이미지](images/page209_img00.webp)

Figure 9-10 Closed Loop Step response of the Example System under P only Control
Figure 9‑11 shows the same system response in presence of a disturbance. As Equation 9‑5 shows, the closed
loop response of an LTI system is a superposition of the responses to reference and to disturbance signals.
In the steady state, ideally we would want the reference-to-output transfer function to be equal to 1, in order
to perfectly duplicate the reference. When the disturbance occurs, we cannot do anything about it as by
definition, it is an unknown signal. Therefore, to reduce its effect on the system output, ideally we would want
the disturbance-to-output transfer function to be zero.
Equation 9-5
As seen in As Equation 9‑5, when the Proportional Gain increases, the steady state value of the closed loop gain
203 | 9.2 Proportional Control
(DC gain for the reference-to-output transfer function) will increase, thus improving the steady state tracking
of the reference. Similarly, the steady state value of the disturbance-to-output transfer function decreases.
Theoretically, when , and when . Of course, realistically,
before that happens, the system will either become unstable or will saturate. Nevertheless, the gain increase
does result in the reduction of the disturbance effect on the steady state system response, however the trade-
off again is more transient oscillations in response to disturbance signal.

![이미지](images/page210_img00.webp)

Figure 9-11 Closed Loop Step Response Under P Control – Effect of Disturbance
9.2.1 Summary of Proportional Control Attributes
Steady State Tracking
• high proportional gain – small steady state error
• low proportional gain – large steady state error
Dynamic Tracking
• high proportional gain – increased system oscillations – can lead to instability
• high proportional gain – undesirable (strong) control effort – may saturate the controller
9.2 Proportional Control | 204
• high proportional gain – wear and tear of equipment
• low proportional gain – sluggish, overdamped response
Disturbance Rejection
• high gain needed to reduce the effect of disturbance on the steady state tracking
• high gain – undesirable: lower stability, possibility of saturation, oscillations
205 | 9.2 Proportional Control
9.3 Proportional + Derivative Control
Consider again the example from Chapter 9.2, where G(s) was described by Equation 9‑3. Assume the closed
loop system has a PD Control implemented. You are, or will be, be familiar with the PD Control from Lab 2.
Replace the Proportional Controller in Figure 9‑9 with the PD Controller described by the following transfer
function:
or
Equation 9-6
The adjustable derivative variable is referred to either as the Derivative Gain, , or the Derivative Time
Constant, . The closed loop system transfer function is then as follows:
Equation 9-7
Let’s assume the value of the Derivative Gain = 2 seconds. The critical gain can be calculated from Routh-
Hurwitz Criterion as and the resulting frequency of marginal oscillations is calculated as
rad/sec. Figure 9‑12 shows the effect of Proportional + Derivative Control on the closed loop
response of this system – with the same controller gain value, the oscillations are greatly reduced but there is
no effect on the steady state tracking (error).
Figure 9‑13 shows the same system response in presence of a disturbance. As expected, there is no effect on
the steady state controller effectiveness in reducing the effect of the disturbance, but the transient effect of the
disturbance signal is reduced – fewer oscillations. Figure 9‑14 shows how the changing value of the Derivative
Time Constant (the same as Derivative Gain ) affects the system closed loop response. The larger the value
of the Derivative Time Constant (or Derivative Gain) the stronger the Derivative effect – hence fewer oscillations.
9.3 Proportional + Derivative Control | 206

![이미지](images/page213_img00.webp)

Figure 9-12 Closed Loop Step response of the example System under Proportional + Derivative Control
207 | 9.3 Proportional + Derivative Control

![이미지](images/page214_img00.webp)

Figure 9-13 Closed Loop Step response Under PD Control – Effect of Disturbance
9.3 Proportional + Derivative Control | 208

![이미지](images/page215_img00.webp)

Figure 9-14 Closed Loop Step response Under PD Control – Effect of Changing Derivative Time Constant
9.3.1 Proportional + Derivative Control in Presence of Noise
Let’s consider now the effect of using a Derivative Control on the system closed loop frequency response
– specifically, its bandwidth. Figure 9‑15 shows the closed loop frequency response of the system under PD
Control vs. the closed loop frequency response of the system under P + Rate Feedback Control.
As seen in Figure 9‑15, the Derivative term in frequency domain is characterized by a constant +20dB/dec slope
on the magnitude plot. Thus, the closed loop zero in PD configuration increases the bandwidth of the closed
loop system, as shown in Figure 9‑15, thus reducing the noise attenuation. This effect does not occur with the P
+ Rate Feedback configuration, as that configuration does not have a zero. The effect of these differences in the
closed loop bandwidth is illustrated in Figure 9‑16 which shows a comparison of the responses of a closed loop
system under PD Control vs. P + Rate Feedback Control, when the system operates in an environment subject
to noise.
As can be seen, PD Control significantly amplifies the noise and as such it is not recommended in environments
where noise is expected. If the controller is to operate in a noisy environment, P+Rate Feedback scheme is a
better option. However, if the reduction of the Derivative effect is not sufficient, there is one more possibility
209 | 9.3 Proportional + Derivative Control
– the Derivative effect can be limited by replacing the PD part of the controller transfer function with the so-
called Lead Network – see more discussion of it in the PID Control section.

![이미지](images/page216_img00.webp)

Figure 9-15 Bandwidth of the Closed Loop System: PD vs. Rate Feedback
9.3 Proportional + Derivative Control | 210

![이미지](images/page217_img00.webp)

Figure 9-16 Noisy System Response: PD vs. Rate Feedback
9.3.2 Summary of Proportional + Derivative Control Attributes
Steady state tracking:
• Derivative action has no effect on the system type and on steady state errors
Dynamic Tracking:
• Derivative can be implemented as PD term in cascade, or as rate feedback. The rate feedback
configuration will not introduce a zero to the system, and will be slower, but also without an additional
overshoot.
• High proportional gain – undesirable (strong) control effort – may saturate the controller
• Derivative is implemented by introducing a zero to the system, which has a high-pass filter characteristic.
Thus, Derivative Mode increases the system bandwidth, and makes it more susceptible to noise, as higher
frequency components are not well attenuated
• Typically, too much of the Derivative action results in a jittery response and vibrations. Rate feedback is not
as noisy as the cascade configuration.
211 | 9.3 Proportional + Derivative Control
9.4 Proportional + Integral Control
Let’s consider again the example from Chapter 9.2, where G(s) was described by Equation 9‑3. Assume the
closed loop system has a PI Control implemented. You are, or will be, be familiar with the PI Control from Lab
3. Replace the Proportional Controller in Figure 9‑9 with the PI Controller described by the following transfer
function:
or
Equation 9-8
The adjustable integral variable in the PI Controller is represented either by the Integral Gain, , or the Integral
Time Constant, . Note that The closed loop system transfer function is then as follows:
Equation 9-9
We can use either the expression for Integral Gain, or its inverse, called the Integral Time Constant . Let’s
have seconds. The critical gain (for marginal stability of the closed loop) can be calculated from
Routh-Hurwitz Criterion as and the resulting frequency of marginal oscillations is calculated as
rad/sec.
Figure 9‑17 and Figure 9‑18 show the effect of Proportional + Integral Control on the closed loop response of
this system – the steady state tracking is seen improved – the steady state error is being integrated to zero.
Figure 9‑19 also shows how the changing value of the Integral Time Constant affects the system closed loop
response, this time in presence of a disturbance. The smaller the value of the Time Constant , (i.e. the larger
the value of the Integral Gain ), the stronger the Integral effect – the error is integrated to zero faster, but
there are more oscillations.
9.4 Proportional + Integral Control | 212

![이미지](images/page219_img00.webp)

Figure 9‑17 Closed Loop Step Response of the Example System under Proportional + Integral Control
213 | 9.4 Proportional + Integral Control

![이미지](images/page220_img00.webp)

Figure 9‑18 Closed Loop Step response Under PI Control – Effect of Changing Integral Time Constant
9.4 Proportional + Integral Control | 214

![이미지](images/page221_img00.webp)

215 | 9.4 Proportional + Integral Control
Figure 9‑19 Closed Loop Step response Under PI Control – Effect on Disturbance
9.4.1 Effect of Windup in Integral Controller
Let’s discuss now the effect of the Integral Control on the controller output. In an ideal LTI system, the system
linear range is infinite. In real life systems, the actuator input can saturate due to physical limitations on its
dynamic range – there is a limit beyond which the controller output is truncated. Because the integral controller
input is non-zero as long as there is an error in the system, its output tends to reach that limit relatively quickly.
Figure 9‑20, left, shows the controller output signal when there is no saturation in it. The system response is
linear, and shown on the right.

![이미지](images/page222_img00.webp)

Figure 9‑20 PI Control: Controller Output and System Output – No Saturation
Figure 9‑21, left, shows the controller output signal when there is saturation – shown as clipping of the controller
output. When the controller output saturates and the integral action is not switched off, the controller output
command still keeps growing because the error signal is still present. Once the system comes out of saturation,
the system will try to “catch up“ to that command, and the system output response will show a large overshoot,
as a result of the energy stored in the integrator. This is known as a Windup Effect. This is visible in Figure 9‑21,
right, as an additional overshoot in the response.

![이미지](images/page222_img01.webp)

Figure 9‑21 PI Control: Saturated Controller Output and System Output – Windup Effect
9.4 Proportional + Integral Control | 216
To remedy the problem, a so-called Anti-Windup scheme is implemented, which turns off the integral action as
soon as actuator saturation occurs. A simulation of the Anti-Windup scheme is shown in Figure 9‑22.

![이미지](images/page223_img00.webp)

Figure 9‑22 PI Control: Anti- Windup Configuration in PI Controller
The unsaturated signal represents the controller digital algorithm output, and the saturated signal, U(s), is the
actual analog controller output, which stays between some set hard limits. When the system is unsaturated,
the anti-windup signal is zero, and the integral action works as intended. When U(s) saturates, an additional
loop around the integrator is created, effectively replacing it with a first-order term with an anti-windup time
constant.
Equation 9-10
The smaller the anti-windup time constant is in Equation 9‑10, the less effective the integral action is, i.e. the
stronger the anti-windup action. Figure 9‑23 shows the effect of Anti-Windup on the response of the PI system.
217 | 9.4 Proportional + Integral Control

![이미지](images/page224_img00.webp)

Figure 9‑23 PI Control: Anti- Windup Effect on the Response of a PI System
9.4.2 Summary of Proportional + Integral Control Attributes
Steady state tracking:
• Integral action stronger for small integral time constants
• Integral action increases system type – smaller step errors and ramp errors
• Integral action reduces the effect of disturbance in the steady state
Dynamic tracking:
• Integral action introduces increased system oscillations, – possible instability
• Possible saturation in the controller (windup) – Anti-Windup scheme
9.4 Proportional + Integral Control | 218
9.5 PID Controller and Its Tuning
PID Controllers yield themselves to simple, empirical (i.e. experimental) adjustments in order to achieve a
satisfactory response. Let’s consider again the example from Chapter 9.2, where G(s) was described as:
Assume the closed loop system has a PID Control implemented. Replace the Proportional Controller in Figure
9‑9 with the PID Controller in its Series Configuration, described by the following transfer function:
or
Equation 9-11
The adjustable variables in the PID Controller are represented either by the Proportional Gain, , Integral
Gain, , and the Derivative Gain, ,or by the Proportional Gain, , the Integral Time Constant, , and the
Derivative Time Constant, . Note that . Let’s assume the value of the Derivative Gain (or Derivative
Time Constant seconds) and the value of the Integral Time Constant seconds ((or Integral Gain
). The closed loop system transfer function of this system under PID Control is shown in Equation
9‑12.
Equation 9-12
The critical gain can be calculated from Routh-Hurwitz Criterion as and the resulting
frequency of marginal oscillations is calculated as rad/sec.
Figure 9‑24 and Figure 9‑25 show P, PI, PD and PID modes comparisons for this Example. Figure 9‑26 shows
the the closed loop response of this system under a well-tuned PID Controller. The PID structure increases the
System Type by one due to the presence of Integrator in the controller, and also introduces two closed loop
zeros. The net effect, as can be seen in Figure 9‑26, is that both the steady state tracking and the transient
response are improved.
The specs achieved by using an empirically tuned PID Controller will not be optimal (i.e. mathematically best
given a set of criteria), but usually satisfactory in an industrial environment. This flexibility and ease of use is
one of the reasons for PID continuing popularity. There are many sophisticated controller design methods such
as pole placement via multiple state feedback, optimal control, Kalman filter design, adaptive reference model
control, etc., but they all require an in-depth knowledge of fairly difficult theoretical background in order to be
used effectively.
219 | 9.5 PID Controller and Its Tuning

![이미지](images/page226_img00.webp)

Figure 9‑24 Proportional vs. PD and PI Control
9.5 PID Controller and Its Tuning | 220

![이미지](images/page227_img00.webp)

Figure 9‑25 Comparison of P, PI, PD and PID Control Modes
221 | 9.5 PID Controller and Its Tuning

![이미지](images/page228_img00.webp)

Figure 9‑26 Well-Tuned PID Controller for the Example System
In contrast, PID setting adjustments, i.e. tuning, can be done almost intuitively, using simple sets of rules
– the so-called tuning methods such as Ziegler-Nichols tuning. It is done best, when combined with basic
understanding of Root Locus rules and of relative stability concepts – Gain Margin. For more information on PID
tuning, read the Appendix to Lab 2 instructions.
9.5.1 PID Controller in Presence of Noise
As discussed previously, Derivative Control increases the system bandwidth, due to the presence of a zero, thus
reducing noise attenuation. This effect is even stronger in the PID Controller, since this controller has two zeros.
If the system is to work in a noisy environment, this may result in unsatisfactory noise attenuation. As discussed
before, Rate Feedback term may be used to replace the Derivative term. When this is not sufficient, another
option is to replace the Derivative term with the so-called Lead Compensator (Controller). We will discuss Lead
Compensation in more detail in the following chapters. The modified Controller transfer function is shown in
Equation 9‑13.
9.5 PID Controller and Its Tuning | 222
Equation 9-13
As Figure 9‑27 shows, when the PD term is replaced with a lead component the zero of the lead
component is smaller than the pole, and as a result, the magnitude slope initially goes up but then levels off. On
the phase characteristic, the PD term adds phase as frequency . With the lead component, while
the phase characteristic initially increases, it too levels off. The effectiveness of the Derivative action is reduced,
but it does help maintain the required noise attenuation at high frequencies.

![이미지](images/page229_img00.webp)

Figure 9‑27 Frequency response of a Series PID Controller vs. PI + Lead Controller
223 | 9.5 PID Controller and Its Tuning
9.6 Effect of PID Controller Modes on
System Stability
PID Controller modes affect the overall system stability and Gain Margin. In general, if Proportional Mode is our
reference, Integral (or Proportional + Integral) Control reduces relative stability of the closed loop system, while
Proportional + Derivative Control increases relative stability of the closed loop system. Let’s consider again the
example from Chapter 9.2, where G(s) was described by Equation 9‑3. The summary of stability analysis for all
four modes of PID Controller for this example is shown in Table 9‑1. We shall return to this topic later, using Root
Locus analysis for discussion.

![이미지](images/page230_img00.webp)

Table 9‑1: Summary of Stability Analysis for the Example System
9.6 Effect of PID Controller Modes on System Stability | 224
9.7 Examples
9.7.1 Example
Consider a closed loop unit feedback system operating initially under Proportional Control where the process
transfer function G(s) is as follows:

![이미지](images/page231_img00.webp)

Part 1. Find the stability range, and assume the operating gain such that the Gain Margin = 2.
Part 2. Next, replace the gain with a parallel structure of the PID Controller, with the settings for the Derivative
Time Constant seconds and for the Integral Time Constant seconds. Fine-tune the PID
Controller by simulations.
9.7.2 Example
Consider again the system from Example 7.3.17 and Example 8.7.14, only now the P+Rate Feedback and PI+ Rate
Feedback are replaced with a series configuration of a PID Controller, as shown.

![이미지](images/page231_img01.webp)

G(s) process transfer function remains the same as before:
225 | 9.7 Examples
All gain values are kept exactly the same as you determined them in those two previous examples:
, and . How different will be the PID system closed loop transfer
function from the P+Rate and PI+Rate? How different will the system step response be? Will the difference be
significant? Briefly justify your answers.
9.7 Examples | 226
CHAPTER 10
227 | Chapter 10
10.1 Introduction
The Root Locus method is a graphical technique used to plot the location of the poles of a closed loop system
as one of the system parameters is varied. This technique is used to provide a measure of the relative stability
of a system, as well as to determine appropriate parameter values, which will yield suitable root locations. In the
general case the open loop transfer function is G(s)H(s). However, typically an equivalent open loop system is
analyzed, with H(s) = 1. Root Locus equations below are derived for such a case, without a loss of generality (see
the notes on the equivalent unit feedback loop).
Consider a simple unity feedback system, such as in Figure 10‑1, with the variable proportional controller gain K.
The closed loop system transfer function and its characteristic equation are as follows:

![이미지](images/page234_img00.webp)

Figure 10‑1 Closed Loop Equivalent Unit Feedback System under Proportional Control
The location of closed loop poles can be traced by plotting them on the same plot for different values of
proportional gain K, as shown in Figure 10‑2. The resulting plot is called the Root Locus plot. The Root Locus
technique can be used to an s-domain based analysis and design of control systems.
The poles of the closed loop system are determined by solving the characteristic equation:
Equation 10-1
10.1 Introduction | 228

![이미지](images/page235_img00.webp)

Figure 10‑2 Example of a Root Locus Plot
Therefore, for the points in S-domain to belong to the Root Locus, it is necessary that two equations be satisfied:
(magnitude criterion)
(angle criterion) Equation 10-2
So, for any gain K, we can solve the above equations to determine the closed loop system pole locations. Notice,
if we allow the controller gain to vary, i.e., , and solve the above two equations, we can plot the
resulting locations (loci) of the closed loop system poles for all (positive) choices of controller gain K, as shown
in Figure 10‑2.
229 | 10.1 Introduction
10.2 Evans' Root Locus Construction
Rules - Introduction
To use analytic techniques to solve Equation 10‑2 for , is time consuming, since we would have
to tediously solve and plot the resulting magnitudes and phase angles of G(s) that satisfy the magnitude and
phase criteria. Also, note that no formulae exist for roots of polynomials of order higher than third, and the roots
for polynomials of higher orders have to be found using iterative numerical methods, such as Newton-Raphson.
However, as it turns out, such analytical solutions are not necessary because Root Loci follow a set of simple
construction rules that were formulated in 1948 by Walter R. Evans, who was working in the field of guidance
and control of aircraft. These rules stem from Equation 10‑2 that must be satisfied for every point on the Root
Locus, and constitute an orderly process for sketching an approximation of the root loci for .
Evans’ Root Locus construction method utilizes the graphical evaluation of a function in the s-plane:
• for any point in the s-plane, the open loop function can be evaluated;
• the angle criterion for
• can be checked;
• if the angle criterion is met, the point belongs to a system Root Locus.
Construction rules developed by Evans dealt with:
Rule 1: Beginning and end of Root Locus plot, symmetry;
Rule 2: Points on the Real axis;
Rule 3: Asymptotic angles and centroid;
Rule 4: Break-away (break-in) points;
Rule 5: Crossovers with Imaginary axis;
Rule 6: Angles of departure (arrival) from/to complex poles (zeros).
Evans also established how to determine the Proportional Gain used in the closed loop system operation that
corresponds to any particular point on the Root Locus by:
• Preparing an accurate Root Locus plot
• Using the magnitude criterion to evaluate the gain at the point
NOTE: In Matlab, to plot Root Locus plots and to evaluate the gains on the plots, we will use the rlocus.m and
rlocfind.m subroutines. Figure 10‑3 shows where the starting points of RL are, the crossover with the Imaginary
axis, asymptotes, centroid and break-away point on RL.
10.2 Evans' Root Locus Construction Rules -
Introduction | 230

![이미지](images/page237_img00.webp)

Figure 10‑3 Components of a Root Locus Plot
As a MATLAB example, consider a unit feedback closed loop control system under Proportional Gain, where
the process transfer function G(s) is as shown below. The Root Locus plot is obtained by MATLAB and shown in
Figure 10‑4.
231 | 10.2 Evans' Root Locus Construction Rules - Introduction

![이미지](images/page238_img00.webp)

Figure 10‑4 MATLAB Example of a Root Locus Plot
10.2 Evans' Root Locus Construction Rules - Introduction | 232
10.3 Evans Root Locus Construction Rule
# 1: Beginning, End and Symmetry
This Rule deals with the beginning and end of the Root Locus plot and its symmetry. We begin by writing the
closed loop system characteristic equation in the form:
Equation 10-3
Secondly, we factor G(s) and rewrite the polynomial equation as:
Equation 10-4
Therefore:
Equation 10-5
Notice that when K = 0, the roots of the characteristic equation are simply the roots of D(s). Notice that as the
gain approaches infinity ( ) the roots of the characteristic equation are given by the roots of N(s).
We observe that the root loci start at the poles, and finish at the zeros. So, if there is an excess of finite poles over
finite zeros, as is the case in strictly proper systems, where do these extra loci go as ? The only way to
satisfy the criterion is to conclude that the excess branches must tend to zeros located at infinity as .
Observations lead us to form our first rule for root locus construction:
Rule 1: Each branch of the root locus is a continuous curve that begins at a pole of G(s), and ends at a
zero of G(s). If the open loop system has m zeros and n poles, with , then m of the root locus
branches will begin at a pole and end at a zero. The n-m remaining branches of root loci will go to
infinity . The number of branches leaving a pole is equal to the multiplicity of the pole, r. The
root loci are symmetrical with respect to the Real axis.
As an example, consider RL shown in Figure 10‑4. There are three RL segments, starting at -2, -5 and -10, which
are open loop pole locations. Since there are no open loop zeros, three segments go to infinity. The plot is
symmetrical about the Real axis.
233 | 10.3 Evans Root Locus Construction Rule # 1: Beginning,
End and Symmetry
10.4 Evans Root Locus Construction Rule
# 2: Segments of Root Locus on Real Axis
This Rule deals with points on the Real axis. Consider the angle criterion:
Equation 10-6
Take some test points for along the Real axis and see what satisfies the angle criterion.
Where must Real axis segments of the root locus lie? Rule 2 answers that question.
Rule 2: A point s on the Real axis belongs to the root locus if and only if it is to the left of the ODD
number of open loop singularities (a singularity is either a pole or a zero).
As an example, consider the RL plot shown in Figure 10‑4, with Real Axis segments as shown in Figure 10‑5.
10.4 Evans Root Locus Construction Rule # 2: Segments of
Root Locus on Real Axis | 234

![이미지](images/page241_img00.webp)

Figure 10‑5 Segments of a Root Locus Plot on Real Axis
235 | 10.4 Evans Root Locus Construction Rule # 2: Segments of Root Locus on Real Axis
10.5 Evans Root Locus Construction Rule
# 3: Asymptotic Angles and Centroid
This Rule deals with the asymptotic angles and centroid location. If gain K is large enough, one can see that the
branches of the RL travelling towards infinity follow a straight line path that is asymptotic to a hypothetical line,
called an asymptote, at a certain angle, called an asymptotic angle. If one extended these hypothetical lines,
they would all intersect at an “anchor” point, called a centroid. Evans showed that the asymptotic angles and
the centroid location can be computed as shown in this Rule.
When the test point is close to the open loop singularities (poles, zeros), angles for vectors drawn from the
singularity towards the point , which are used to evaluate function, are quite different. However, as the
gain K tends to approach infinity, , which is the descriptor for asymptotic condition, point begins
to practically lie on the asymptote, and these angles all begin to look alike, and approach the asymptotic angle
.
Recall that the total angle of the function is equal to:
Equation 10-7
The total angles, respectively, for all vectors associated with poles and all vectors associated with zeros, will be
equal to:
Equation 10-8
If the test point is to belong to the root locus, angle of has to meet the angle criterion:
Equation 10-9
In the formula below, the sign in the denominator is reversed, because . This will have no effect on the
formula, because . The asymptotes need to be anchored on the plot. To do that, a so-called
root locus centroid is defined, as a “centre of gravity” of the plot.
Rule 3: The asymptotes are centered on the Real axis at the centroid, described by this equation:
Equation 10-10
The branches of Root Locus that tend to infinity converge at asymptotic angles, described by this
equation:
10.5 Evans Root Locus Construction Rule # 3: Asymptotic
Angles and Centroid | 236
Equation 10-11
As an example, consider RL shown in Figure 10‑4. Centroid and asymptotes are calculated as follows:
,
See how this shows on the RL plot in Figure 10‑6.
237 | 10.5 Evans Root Locus Construction Rule # 3: Asymptotic Angles and Centroid

![이미지](images/page244_img00.webp)

Figure 10‑6 Example of Root Locus with Centroid, Asymptotic Angles and Break-Away Point
10.5 Evans Root Locus Construction Rule # 3: Asymptotic Angles and Centroid | 238
10.6 Evans Root Locus Construction Rule
# 4:Break-Away and Break-In Points
This Rule deals with break-away or break-in points. As the Gain increases, the closed loop poles initially move
along the Real axis since typically the open loop poles are real. When the two closed loop poles meet, the RL
segments break way from the Real axis. The coordinate of that is called a breakaway point. In some systems,
with multiple zeros, instead of a break-away point, there will be a break-in point, where the complex segments
of the RL enter the Real axis.
Rule 4: The break-away (break-in) points can be found by re-writing the closed loop characteristic
equation as a function of gain , and taking a derivative of w.r.t. s:
and solving for
Equation 10‑12
In our example:
We have two values that could be our break-away point: and , but the first one does not
belong to the Root Locus (see Rule 2), hence our coordinate is – this is consistent with the Matlab results,
as seen in Figure 10‑6.
239 | 10.6 Evans Root Locus Construction Rule #
4:Break-Away and Break-In Points
10.7 Evans Root Locus Construction Rule
# 5: Crossover with Imaginary Axis
This Rule deals with crossovers with the Imaginary axis and provides an alternative way of finding the critical
gain and the frequency of marginal oscillations that can also be found using the Routh-Hurwitz stability
criterion.
Rule 5: Imaginary axis crossings are found by solving the characteristic equation for the critical value of the
gain, . Since the equation is complex, it yields two conditions (for Im and Re parts) and thus
both the critical gain and the frequency of oscillations can be computed.
In our example, the crossovers with Imaginary axis are:
The final answer is rad/sec and
10.7 Evans Root Locus Construction Rule # 5: Crossover with
Imaginary Axis | 240

![이미지](images/page247_img00.webp)

Figure 10-7 Critical Gain and Frequency of Marginal Oscillations
We can verify this using Routh-Hurwitz Criterion. The system Closed Loop Transfer Function is:
Apply the Routh-Hurwitz criterion to the closed loop characteristic equation:
The necessary condition is:
241 | 10.7 Evans Root Locus Construction Rule # 5: Crossover with Imaginary Axis
K>-10
Sufficient conditions from Routh Array:

![이미지](images/page248_img00.webp)

The resulting condition is:
What happens when the gain reaches the critical value? When :

![이미지](images/page248_img01.webp)

Thus, when , from the Auxilliary Equation we have: rad/sec. We can also verify this
result by using the MATLAB subroutine “rlocfind“.
10.7 Evans Root Locus Construction Rule # 5: Crossover with Imaginary Axis | 242
10.8 Evans Root Locus Construction Rule
#6: Angles of Departures/Arrivals at
Complex Poles/Zeros
This Rule deals with angles of departure (arrival) from/to complex poles (zeros).
Rule 6: If has a pole p of multiplicity r, then r branches of the root locus depart from p. The
angle of departure of these root loci from p are described by this equation:
=
Equation 10-13
Similarly, if has a zero z of multiplicity r, then r branches of the root locus arrive at z. The angle
of arrival of these root loci to z are described by this equation:
Equation 10-14
See Examples in the next section for illustration of this rule.
243 | 10.8 Evans Root Locus Construction Rule #6: Angles of
Departures/Arrivals at Complex Poles/Zeros
10.9 Examples
10.9.1 Example
Consider a unit feedback closed loop system under Proportional Control where the open loop process is
given by the equation below, and sketch a Root Locus plot for this system.
10.9.2 Example
Consider a unit feedback system with a process described below. Sketch the Root Locus for the system.
10.9.3 Example
Consider a certain closed loop unit feedback control system under Proportional Control (Gain ) where the
process transfer function is as follows:
See the Root Locus plot for this system, shown below. Determine the critical value of the gain, at which
the system becomes marginally stable, and the corresponding frequency of marginally stable oscillations,
.

![이미지](images/page250_img00.webp)

Apply the Routh-Hurwitz Criterion of Stability to determine the critical value of the gain, , at which the
system becomes marginally stable,and the corresponding frequency of marginally stable oscillations, .
Determine the range of gains to provide a stable closed loop system response. How do they compare to
item 1)?
10.9 Examples | 244
10.9.4 Example
Consider a unit feedback system with a process as described.
Where is an adjustable proportional gain controller and is a process transfer function. Sketch a Root
Locus of the closed loop system poles for < in the space provided in Figure below. Calculate values
of the centroid , asymptotes , breakaway points, if any, as well as coordinates of the crossovers with the
imaginary axis, if any.
An equivalent damping ratio, , of the closed loop step response, equal to 0.707, is required. From the root locus
plot, find the corresponding value of the controller gain . Calculate the closed loop system transfer function,
, for this value of . Suppose that we increase up from the value found in . Complete the following
table:
Percent Overshoot will Increase Decrease Insufficient information to make a decision
Settling Time will Increase Decrease
Insufficient information to make a decision
Rise Time will Increase Decrease Insufficient information to make a decision
Steady State Error to a Ramp Input will Increase Decrease Insufficient information to make a decision
10.9.5 Example
Consider a unit feedback system with a process as follows, working under Proportional Control:
Apply the Routh-Hurwitz stability criterion to this system and determine the critical value(s) of gain, , for
system stability, as well as the frequency of oscillations, , resulting when .
Sketch a detailed, to-scale, Root Locus of the closed loop system poles for < . Find all relevant
coordinates. NOTE: If at any point you are using estimates, instead of accurate values, explain why.
Use your Root Locus sketch to find the value of operational gain such that the closed loop step response
of the system will exhibit Percent Overshoot equal to approximately . At that value of the gain, what would
the resulting settling time of the closed loop response be? What would the steady state error be?
10.9.6 Example
The open loop transfer function of a unity feedback control system is described as follows:
Where is an adjustable proportional gain controller and is a process transfer function.
Sketch a Root Locus of the closed loop system poles for < . Calculate values of the centroid ,
asymptotes , breakaway points, if any, as well as coordinates of the crossovers with the imaginary axis, if any.
245 | 10.9 Examples
From the sketch, obtain the largest value of the proportional controller gain so that the overshoot in a closed
loop step response will be less than . At this value of the controller gain, estimate all of the closed loop
system pole locations, and briefly explain whether the closed loop dynamics can be adequately represented by
a second order system model.
10.9.7 Example
The open loop transfer function of a unity feedback control system is described as follows:
= =
Where is an adjustable proportional gain controller and is a process transfer function. Sketch a
detailed Root Locus for the system, including crossovers with the imaginary axis, if any, break-away/break-in
coordinates, if any, asymptotes, if any, a centroid, etc. if you are using estimates, explain why.
Determine the value of the gain that would result in the closed loop system equivalent damping ratio of
. What is the system Gain Margin at this value of the gain?
Find the closed loop transfer function at the gain as calculated. Would the system closed loop behaviour be well
approximated by a second order model at this gain setting? Briefly justify your answer. If it is yes, determine
the remaining model parameters and and write the model transfer function .What will be the
expected Percent overshoot, Settling Time and Steady State Error of the closed loop step response?
10.9.8 Example
Consider a closed loop unit feedback system under Proportional Control with a process described by:
Sketch the Root Locus for the system. Estimate the stable range of the system operation. Is this system a
good candidate to be approximated by a standard order model? Find the value of Proportional Gain such
that the closed loop step response has seconds. Evaluate the resulting PO and the steady state
error. Compare with actual simulation results. Find the value of Proportional Gain such that the closed loop
response has the PO < . Evaluate the resulting and the steady state error. Compare with actual
simulation results.
10.9.9 Example
Consider a unit feedback system under Proportional Control with a process described by:
Sketch the Root Locus for the system. Find the value of Proportional Gain such that the closed loop step
response has the PO of less than Evaluate the settling time .
10.9.10 Example
Consider the feedback system under Proportional Control as shown:
10.9 Examples | 246
Sketch a detailed Root Locus for the system, including crossovers with the imaginary axis, breakaway
coordinates, asymptotes, centroid, etc. Determine the value of the gain K that would result in the closed loop
system equivalent damping ratio of . Determine the location of all three closed loop poles for this value
of the gain. Would the system closed loop behaviour be well approximated by a second order model at this gain
setting? If the answer is yes, determine the remaining model parameters and .
10.9.11 Example
Consider a unit feedback system under Proportional Control with a process described by:
Sketch the Root Locus for the system. Find the value of Proportional Gain such that the damping ratio of the
complex poles is equal to . Is the order model for the closed loop response applicable here?
10.9.12 Example
Consider a unit feedback closed loop system under Proportional Control where the process is:
Sketch a Root Locus for this system. Take a pair of points on the root locus with coordinates of
These are two of the three closed loop poles of the system. A corresponding third pole of
the closed loop system is on the Real axis at . We’d like to find out what value of the gain K corresponds
to this location. Find the closed loop transfer function for that gain and decide if the second order model would
be appropriate.
10.9.13 Example
Consider a certain unit feedback closed loop control system where the process is described by a transfer
function . We know that the process is of a order and that the process gain is equal to
. Initially the system is not compensated; i.e. the controller transfer function is . Consider the Root
Locus graph, taken for the uncompensated system, shown next. Based on the information in the graph, write
the transfer function for the order process (Note – is the adjustable proportional gain used to
obtain the Root Locus) and identify the system TYPE.
247 | 10.9 Examples

![이미지](images/page254_img00.webp)

Now consider the same uncompensated system Root Locus with an additional information obtained using
MATLAB rlocfind function. Based on it, identify the critical gain that will cause the closed loop uncompensated
system to be marginally stable, as well as the frequency of resulting oscillations.

![이미지](images/page254_img01.webp)

10.9 Examples | 248
Now consider the compensated system Root Locus with information provided in the next graph, again
obtained using rlocfind.

![이미지](images/page255_img00.webp)

First, compare it with the uncompensated Root Locus and identify the type of Controller used, and its time
constant, if it applies. Consider the compensated system Root Locus and identify the critical gain that will cause
the closed loop compensated system to be marginally stable, as well as the frequency of resulting oscillations.
Has the relative stability of the system improved after this Controller was implemented, or worsened? Explain.
10.9.14 Example
A certain process is to work in a closed loop control system under Proportional Control in a unit
feedback configuration. The process transfer function is described as follows:
Find the closed loop system Characteristic Equation and determine the range of Proportional Gains for a
stable closed loop system response, the critical value of gain at which the system would be marginally stable,
and the resulting frequency of constant oscillations. Sketch a detailed, to-scale, root locus of the closed loop
system poles for . Use the Root Locus sketch to find the value of operational gain such that
the closed loop step response of the system will exhibit Percent Overshoot equal to . At the value of the
operational gain found in the previous item, estimate the closed loop response specifications.
10.9.15 Example
Consider the feedback system under Proportional Control as shown:
Sketch a detailed, to-scale, Root Locus of the closed loop system poles for for .. Find all relevant
coordinates. Use your Root Locus sketch to find the value of operational gain such that the closed loop
step response of the system will exhibit Percent Overshoot equal to approximately . At that value of the
gain, what would the resulting settling time of the closed loop response be?
10.9.16 Example
Consider the feedback system under Proportional Control as shown:
249 | 10.9 Examples

![이미지](images/page256_img00.webp)

Find its transfer function. The system will work in a closed loop feedback configuration with a unity feedback
and under Proportional Control (Gain ). Find the closed loop transfer function of the system,
, and establish the range of positive gain values that would result in a stable closed loop system response by
using the
Root Locus. Find the critical gain , at which the system would be marginally stable, and the corresponding
frequency of oscillations of the marginally stable response .
10.9.17 Example
Consider a closed loop unit feedback system, where the process transfer function is as follows:
Assume that the compensated system will work under Proportional Control and find the controller setting such
that Percent Overshoot will be .
10.9.18 Example
An actuator/process in a unit feedback closed loop control system. First, consider Proportional Control and find
the gain value such that the PO is approximately . What is the Settling Time? Can it be improved?

![이미지](images/page256_img01.webp)

Next, a Parallel PID controller is added to the feed-forward path of the system.

![이미지](images/page256_img02.webp)

Find controller parameters so that the closed loop system has: a pair of dominant poles with time constant of 1
second and the actual frequency of oscillation of rad/sec, and a pole with time constant second.
10.9.19 Example
Consider a unit feedback control system under PID Control, where the process transfer function is described
below as , and the PID Controller transfer function is described below as :
10.9 Examples | 250
Where seconds and seconds. Sketch a detailed Root Locus for the system, including
crossovers with the Imaginary axis, if any, break-away/break-in coordinates, if any, asymptotes, if any, centroid,
etc. If you are using estimates, explain how you arrived at them. It is desired that the compensated closed loop
system step response has an equivalent damping ratio equal to – assume that the closed loop system can
be approximated by a second order model based on the dominant pair of complex poles and determine the
appropriate value of the Proportional Gain for the PID Controller.Briefly discuss why the assumption made
in Item is justified. Next, determine the order model parameters , , and to accurately describe
the compensated closed loop system, and write the model transfer function What are your estimates
of the Percent Overshoot, PO, Settling Time, , and Steady State Error, in the closed loop step
response? NOTE: you can solve this item without having a complete solution to Item .
10.9.20 Example
Consider a unit feedback control system that is open-loop unstable, where the process transfer function
is described as:
Determine if it is possible to stabilize the closed loop system by using Proportional Control only – to do so,
sketch a Root Locus for the uncompensated system. Provide only rough estimates of any break-away/break-in
coordinates. Use the Root Locus plot to justify your answer, very briefly.
To stabilize the system, a series configuration of a PID Controller and a PI Controller with Rate Feedback are
considered, as shown in the following diagrams. In both cases the Controller Time Constants are:
seconds and seconds. The closed loop Characteristic Equation is the same for both implementations:

![이미지](images/page257_img00.webp)

251 | 10.9 Examples

![이미지](images/page258_img00.webp)

The resulting Root Locus plot will be the same for both compensation schemes. Sketch the Root Locus – provide
only rough estimates of break-away/break-in coordinates. To save time, the Routh-Hurwitz Stability Criterion
results have already been computed for you: = 6.36 V/V and =2.05 rad/sec.
Next, assume a dominant complex poles model for the compensated closed loop system – see transfer function
– and use the Root Locus sketch to choose the location corresponding to the Settling Time,
, equal to 2 seconds. Calculate the corresponding Proportional Gain . What is the expected
Percent Overshoot and Steady State Error in the closed loop step response?
Part 3: If the Series PID Controller Configuration is implemented, will the actual Settling Time and Percent
Overshoot differ from the values expected based on the dominant poles model? If so, why? No calculations
required – answer very briefly.
If the PI + Rate Feedback Controller Configuration is implemented, will the actual Settling Time and Percent
Overshoot differ from the values expected based on the dominant poles model? If so, why? No calculations
required – answer very briefly.
10.9.21 Example
Consider a closed loop control system working in a unit feedback configuration under Proportional Control,
where the process transfer function is described as follows:
Part 1. Sketch the root locus plot and calculate all relevant coordinates, such as the crossovers through the
Imaginary Axis, the break-away, the centroid and the asymptotic angles.
Part 2. Determine the value of the Operational Gain ( ) such that the closed loop step response will have
a Percent Overshoot of 5%. For the computed value of the Operational Gain, , answer these questions: 1)
What will be the steady state error, in , of the closed loop step response? 2) What will be the Settling Time,
of the closed loop step response? 3) What will be the system Gain Margin?
10.9.22 Example
Consider the feedback system under Proportional Control as shown:
⋅ ⋅
Sketch a detailed Root Locus for the system, including crossovers with the imaginary axis, if any, break-away/
break-in coordinates, if any, asymptotes, if any, a centroid, etc. if you are using estimates, explain why.
Determine the value of the gain that would result in the closed loop system equivalent damping ratio of
. What is the system Gain Margin at this value of the gain?
Find the closed loop transfer function at the gain as calculated. Would the system closed loop behavior be well
10.9 Examples | 252
approximated by a second order model at this gain setting? Briefly justify your answer. If it is yes, determine
the remaining model parameters and , and write the model transfer function . What will be the
expected Percent overshoot, Settling Time and Steady State Error of the closed loop step response?
10.9.23 Example
Consider a unit feedback control system under Proportional Control, where the process G(s) is described by a
different transfer function:
Note that the process is unstable and that it also has a pair of complex poles. Your task is to investigate
the behaviour of the closed loop system, including its stability, using Root Locus Analysis. Sketch a detailed
Root Locus for the system, including break-away/break-in coordinates, if any, asymptotes, if any, a centroid,
angles of departure from the complex poles, etc. If you are using estimates, explain why. Determine the exact
coordinates of the crossovers of the Root Locus with the Imaginary Axis. Next, determine the value(s) of the
Proportional Controller Gain, , at which the closed loop system becomes marginally stable, and
the corresponding frequency(ies) of marginally stable oscillations, . Finally, determine the practical range
of safe operating gains for the Proportional Controller in this system.
10.9.24 Example
Consider a certain closed loop unit feedback control system under Proportional + Derivative Control with
Derivative Time Constant = 2 where the Controller and the Process G(s) are described as follows:
=
Part 1: Sketch a Root Locus plot of the system. Find all relevant coordinates, including its centroid, asymptotic
angles, if any, accurate coordinates of the break-away/break-in points, if any, accurate coordinates of crossovers
with the Imaginary Axis, if any.
Part 2: Use the Root Locus sketch to select a PD Controller Gain such that the closed loop system would
have the damping ratio of the dominant complex poles equal to . Note that there are two possible
choices of the Controller Gain that meet the condition – clearly indicate their location on the Root Locus,
then select the location that would result in a more desirable response and calculate the corresponding PD
Controller Gain, .
Briefly justify your choice of the Root Locus location for the Controller gain.
Part 3: Estimate the following compensated closed loop response specifications when the PD Controller Gain
value is as chosen in Part 2: PO, , , , .
253 | 10.9 Examples
CHAPTER 11
Chapter 11 | 254
11.1 Gain Margin from Bode Plot
At the critical gain value , the system is marginally stable with some roots on the imaginary axis
(recall Routh Array):
Equation 11‑1
The closed loop characteristic equation at is:
Equation 11‑2
The frequency of oscillations at can be established from the phase plot as the frequency at
which the phase plot crosses over the line. Then, can be found from the gain plot. Figure 11‑1,
Figure 11‑2 and Figure 11‑3 show open loop frequency response plots of a certain system as K changes, with
the corresponding closed loop pole locations and the corresponding step response. Watch for the frequency
of oscillations at at which the phase plot crosses over the line. Based on these plots, a
graphical alternative can be found to calculating the Gain margin from the gain and phase equation. Note that
since it is customary to use decibel units on frequency response plots, Gain margin will now be also expressed
in decibel units, rather than in Volt/Volt units. Recall that:
• corresponds to a marginally stable system
• corresponds a stable system
• corresponds to an unstable system.
The equivalent values of the gain margin in decibels will be then:
• dB corresponds to the marginally stable system
• dB corresponds to the stable system
• dB corresponds to the unstable system
Let the crossover frequency be defined as , the frequency at which the phase plot crosses over the
line, then let the Gain Margin be defined in dB units:
Equation 11‑3
255 | 11.1 Gain Margin from Bode Plot

![이미지](images/page262_img00.webp)

Figure 11-1 Relative Stability in Frequency Domain: Stable System

![이미지](images/page262_img01.webp)

Figure 11-2 Relative Stability in Frequency Domain: Marginally Stable System
11.1 Gain Margin from Bode Plot | 256

![이미지](images/page263_img00.webp)

Figure 11-3 Relative Stability in Frequency Domain: Unstable System
As shown in Figure 11‑4, if the open loop plot is below the 0 dB axis at the frequency of crossover, ,
then the system has a positive decibel Gain Margin and is stable. If the open loop plot is above the 0 dB
axis at the frequency of crossover, , then the system has a negative decibel Gain Margin and is unstable. If
the open loop plot crosses the 0 dB axis exactly at the frequency of crossover, , then the system has
a zero decibel Gain Margin and is marginally stable.
257 | 11.1 Gain Margin from Bode Plot

![이미지](images/page264_img00.webp)

Fig. 11-4 Definition of the Gain Margin
Note that and can be calculated analytically from the Routh-Hurwitz Criterion. The advantage of
using the Gain Margin in frequency domain is that when the system transfer function G(s) is of a higher order,
Routh Array calculations become unwieldy. However, Gain Margin in frequency domain can be easily obtained
graphically (either from simulations of the open loop frequency response plots, or by sketching straight lines
approximations – Bode plots).
Moreover, in cases when open loop frequency response plots are obtained experimentally, and the system
model is not identified, Gain Margin criterion of stability can still be applied. This allows for a system analysis
(and also controller design), without the need to determine an accurate system model, which may be quite
an involved procedure. Finally, if a lower order system model is obtained using dominant characteristics, Gain
Margin will still accurately reflect higher order system dynamics, which affect the system stability.
11.1 Gain Margin from Bode Plot | 258
11.2 Definition of Phase Margin
A corollary to the Gain Margin can also be defined, describing the so-called Phase Margin. Let the crossover
frequency be defined as , the frequency at which the gain plot (in dB) crosses over 0 dB line, then let Phase
Margin be defined as:
Equation 11‑4
As shown in Figure 11‑5, if Phase Margin is found above line, then it is considered positive,
, and is associated with the stable system, where Gain margin is also positive. is associated with a
marginally stable system, where gain margin is also equal zero. If Phase Margin is found below line,
then it is considered negative, , and is associated with the unstable system, where Gain margin is also
negative.

![이미지](images/page265_img00.webp)

Fig 11-5 Definition of the Phase Margin
259 | 11.2 Definition of Phase Margin
11.3 Examples
11.3.1 Example
Let’s review the basics of Bode plots. A certain system has the following transfer function:
Match it with one of the Bode plots shown 6 below, A, B, C, or D, and clearly indicate your choice here.
11.3 Examples | 260

![이미지](images/page267_img01.webp)

)B(

![이미지](images/page267_img00.webp)

)A(

![이미지](images/page268_img01.webp)

)D(

![이미지](images/page268_img00.webp)

)C(
11.3.2 Example
Consider a unit feedback control system under Proportional control, with an open loop transfer function
where is the controller gain. Frequency response plots of are
shown. Determine the system Gain Margin , and the system Phase Margin . Determine whether the
system is stable or unstable, and determine how much of an increase in or decrease in the positive controller
gain is required to render the system marginally stable. Determine the system Type Number. Next, based
on the open loop frequency response plots, and assuming that the closed loop system exhibits predominantly
second order characteristics, evaluate the closed loop system damping ratio, frequency of natural oscillations
and DC gain. Finally, obtain an expression for the open loop transfer function, .

![이미지](images/page269_img00.webp)

11.3.3 Example
Consider a transfer function of a certain process:
Draw a Bode plot, i.e. a linear approximation, of its frequency response. Verify using Matlab, if the shape is
correct.
263 | 11.3 Examples
11.3.4 Example
Consider again the closed loop unit feedback control system under Proportional Control (gain ), discussed in
Example 10.9.3. Open loop frequency response plots of the system (with are shown below.

![이미지](images/page270_img00.webp)

Using the plots, find the system Gain Margin, Phase Margin and corresponding crossover frequencies.
Determine the critical value of the gain, , at which the system becomes marginally stable, and the
corresponding frequency of marginally stable oscillations, . Determine the range of gains to provide
a stable closed loop system response. How do they compare to the solutions obtained in Example 10.9.3, based
on the Routh-Hurwitz Criterion?
11.3.5 Example
Consider the open loop Bode plots shown on the next page. Determine if the system is stable or unstable by
finding its Gain Margin, Phase Margin, Gain-crossover frequency and Phase-crossover frequency. Using linear
approximation, find the open loop transfer function G(s) form the Bode plot for the system shown below. Is it
minimum-phase or non-minimum phase? Next, apply the Routh-Hurwitz criterion to verify the Gain Margin
result.
11.3 Examples | 264

![이미지](images/page271_img00.webp)

11.3.6 Example
A certain unit feedback control system operates under Proportional Control (K is an adjustable gain). The
process transfer function G(s) is not known. The following figure shows measured frequency response plots
of the process, with linear approximations, i.e. the Bode Plot, already superimposed. Determine the transfer
function of the process.
Next, use the accurate frequency response plots to determine the closed loop system Gain Margin and
Phase Margin , and the corresponding crossover frequencies. Is the closed loop system stable? What is the
critical gain, , at which the system will be marginally stable? What is the frequency of oscillations, ,
at that gain?
Finally, use Routh-Hurwitz criterion to find the critical gain, , at which the system will be marginally stable,
and the frequency of oscillations, , at that gain. Are the results of items a) and b) the same? Explain any
discrepancies.
265 | 11.3 Examples

![이미지](images/page272_img00.webp)

11.3.7 Example
Consider the following process transfer function of a unit feedback control system:
Assume the Proportional Control and find the stability range for this system using Routh-Hurwitz Criterion,
Root Locus and then Gain Margin from Bode plot. Note that for the latter, you need to sketch the plot first.
11.3.8 Example
Consider a unit feedback system under Proportional Control, where G(s) is a transfer function of an unknown
process. Frequency response of the process was measured and its plots are shown next. Use the accurate
frequency response plots to determine the Gain Margin of the system, the corresponding frequency of
crossover, and the maximum value ( ) of the gain range for a stable operation of the closed loop system.
Next, use the linear approximations of the magnitude plot (also shown) to identify the process transfer function
G(s) – the process is known to be minimum phase. Form the Routh Array and apply the Routh-Hurwitz criterion
11.3 Examples | 266
to determine the range of gains for the stable operation of the closed loop system as well as the frequency at
which the system response will oscillate if the gain is set to its maximum value value ( ).

![이미지](images/page273_img00.webp)

267 | 11.3 Examples
11.3.9 Example
Consider again the control system discussed in Chapter 2.4, where we had a unit feedback system under
Proportional Control:
Determine the range of gains K required for a stable operation of this closed loop system using the Gain
Margin from frequency response. Recall that the critical gain was found from the Routh-Hurwitz Criterion to
be , and from the Auxilary Equation we found rad/sec.
11.3.10 Example
An open loop transfer function of a certain unit feedback control system is described as follows:
K is an adjustable gain and G(s) is the process transfer function. On the graph provided, plot a straight-line
approximation of the magnitude and phase of the transfer function, , for K=10.
From your plot, measure the relative stability of the closed loop system by finding the system Gain Margin,
GM, the Phase Margin, PM, the corresponding crossover frequencies, and the range of positive gain K for a
stable operation of the closed loop system. Apply the Routh-Hurwitz criterion of stability to this system to find
the range of positive gain K that ensures stable operation of the closed loop. Briefly outline reasons for any
discrepancy with your results.
11.3.11 Example
Consider a unit feedback system under Proportional Control:
Find the system Gain Margin, Phase Margin and corresponding crossover frequencies. Determine the critical
value of the gain, , at which the system becomes marginally stable, and the corresponding frequency of
marginally stable oscillations, . Determine the range of gains to provide a stable closed loop system
response.
Verify the results from Part A by applying the Routh-Hurwitz Criterion of Stability: find the critical value of the
gain, , at which the system becomes marginally stable, and the corresponding frequency of marginal
oscillations, . Comment on discrepancies, if any.
11.3 Examples | 268

![이미지](images/page275_img00.webp)

11.3.12 Example
Consider a unit feedback system under Proportional Control:
Frequency response plots of the open and closed loop (assuming Controller Gain = 1) are shown below –
NOTE: the plots are not labeled – you should be able to recognize which plot corresponds to which response.
Using the open loop frequency response plot, apply Bode Criterion of Stability. Verify the above results by
applying the Routh-Hurwitz criterion of Stability. Compute the critical value of the gain, , that would result
in a marginal stability of the system, and the frequency of resulting marginal oscillations, . Explain any
possible sources of discrepancies.
269 | 11.3 Examples

![이미지](images/page276_img00.webp)

11.3.13 Example
Consider a unit feedback system under Proportional Control, as shown. Frequency plots of the system open
loop are also shown.

![이미지](images/page276_img01.webp)

Find the system Gain Margin, Phase Margin and corresponding crossover frequencies. Determine the critical
value of the gain, , at which the system becomes marginally stable, and the corresponding frequency of
marginally stable oscillations, . Determine the range of gains to provide a stable closed loop system
response. Use MATLAB functions “margin” and ” rlocfind” to verify these results.
Verify the results from Part 1 by applying the Routh-Hurwitz Criterion of Stability: find the critical value of the
gain, , at which the system becomes marginally stable, and the corresponding frequency of marginally
stable oscillations, .
11.3 Examples | 270

![이미지](images/page277_img00.webp)

11.3.14 Example
Consider a unit feedback system under Proportional Control, as shown. Frequency plots of the system open
loop transfer function when the operational gain is = 1 are shown next.

![이미지](images/page277_img01.webp)

271 | 11.3 Examples

![이미지](images/page278_img00.webp)

Apply the Bode stability criterion (i.e. determine the closed loop system Gain Margin, Phase Margin and the
corresponding crossover frequencies) for two cases, when the operational gain is = 1 and = 10.
Apply the Routh-Hurwitz stability criterion to this system and determine the critical value(s) of gain, for
system stability, as well as the frequency of oscillations, , resulting when . Next, assuming that
the operational values of the proportional gain are again = 1 and = 10, compute the corresponding
values of the Gain Margins. Comment if the results you get are consistent with the results from item # 1.
Next, find the range of operational gains such that the system is stable AND the steady state error to the
unit step reference signal is less than 10%. When the error is exactly 10%, what is the system Gain Margin? Is it
possible to operate the closed loop system that the steady state error requirement is no more than 5%? If yes,
why? If no, why?
11.3.15 Example
Consider a unit feedback system under Proportional Control, as shown. Frequency plots of the system open
loop transfer function when the operational gain is = 1 are shown next. Apply the Bode stability criterion
for two cases, when = 1 and = 10, verify using Routh Array.
11.3 Examples | 272

![이미지](images/page279_img00.webp)

![이미지](images/page279_img01.webp)

11.3.16 Example
Consider a certain closed-loop unit feedback control system under Proportional Control (gain ) where the
process transfer function is as follows:
Sketch a Root Locus plot of the system. However, only very rough estimates of break-in and break-away points
273 | 11.3 Examples
are required (no calculations) – focus on the overall shape of the plot and on the crossovers with the Imaginary
Axis. Determine the critical value (or values) of the gain, , at which the system is marginally stable, and
the corresponding frequency (or frequencies) of marginally stable oscillations, . Use the Root Locus plot to
interpret the results and to correctly determine the range (or ranges) of the gains that will provide a stable
closed loop system response. A frequency response plot of G(s) is provided – use the plot to verify the above
results – to do so, clearly identify the frequency (or frequencies) of marginally stable oscillations, , and the
corresponding values of the gain, .

![이미지](images/page280_img00.webp)

Verify the stability results using Routh Array and Routh-Hurwitz Criterion of stability.
11.3.17 Example
Consider a certain unit feedback closed-loop control system under Proportional Control, as shown. Open-loop
frequency response plots of the system with are shown as well.
11.3 Examples | 274

![이미지](images/page281_img00.webp)

Using the plots, find the system Gain Margin, Phase Margin, and corresponding crossover frequencies.
Determine the critical value of the gain, , at which the system becomes marginally stable, and the
corresponding frequency of marginally stable oscillations, . Determine the range of gains to provide a
stable closed-loop system response.
Verify the results above by applying the Routh-Hurwitz Criterion of Stability: find the critical value of the gain,
at which the system becomes marginally stable, and the corresponding frequency of marginally stable
oscillations, . How do they compare to item 1)? Part 3: For , determine the following closed loop
steady-state response specifications: System Type, Error Constants and Errors.
275 | 11.3 Examples
CHAPTER 12
Chapter 12 | 276
12.1 Model from Closed Loop Frequency
Response
12.1.1 Second-Order Model in Frequency Domain
Consider a closed-loop system as shown:

![이미지](images/page283_img00.webp)

Fig. 12-1 2nd Order Closed Loop System
The form of G(s) indicates the process is Type 1 (one integrator present). This means there will be no steady-state
error in the step response of the closed-loop system, and the DC gain of the closed-loop will be equal to 1. The
closed-loop transfer function is that of the standard 2nd order system with the DC gain equal to 1:
Equation 12‑1
In the frequency domain:
Equation 12‑12
Values of the damping ratio will affect the shape of the magnitude and phase plots, as shown in Figure 12‑2
for several values of damping ratio between 0 and 1, and for . Small values of the damping ratio
correspond to large resonant peaks on the magnitude plot. Note that linear approximations cannot be used in
this case.
277 | 12.1 Model from Closed Loop Frequency Response

![이미지](images/page284_img00.webp)

12.1 Model from Closed Loop Frequency Response | 278
Figure 12 2: Frequency Response of 2nd Order System as Function of Damping Ratio
For
Equation 12‑3
The magnitude is high at frequency , but not at its peak. The maximum magnitude of the resonant peak,
, occurs at the frequency of resonance, . Relationships between these two parameters and the system
parameters , are as follows:
Equation 12‑4
Equation 12‑4 can be derived as follows:
Equation 12‑5
To find the maximum of the magnitude function, its derivative is set to zero:
Equation 12‑16
Equation 12-17
Equation 12-18
Equation 12-19
279 | 12.1 Model from Closed Loop Frequency Response
Note that instead of solving Equation 12‑9, readouts of and can be obtained from the plots in Figure 12‑4
and in Figure 12‑3, representing these equations. Knowing and which can also be read off the closed
loop frequency response plot, if it is available, the complete closed loop transfer function in Equation 12‑1 can be
found.

![이미지](images/page286_img00.webp)

Fig. 12-3: Relationship between Damping Ratio and Resonant Peak
12.1 Model from Closed Loop Frequency Response | 280

![이미지](images/page287_img00.webp)

Fig. 12-4: Relationship between Damping Ratio and Frequency of Resonance
12.1.2 Dominant Poles Model in Frequency Domain
Consider now a closed loop system as shown:

![이미지](images/page287_img01.webp)

Process G(s) is now of the order higher than 2nd, and it doesn’t have to be Type 1. In fact, it will most likely
be Type 0, as the majority of industrial systems are. If the open loop transfer function is Type 0 (i.e. has no
integrator in it), the closed loop system has the DC gain of less than 1. Assume that the resulting closed loop
system transfer function will have two dominant complex poles (such assumption holds true for a vast majority
of industrial systems), as shown in Figure 12‑5. The DC gain has to be accurately reflected in the system model.
As a result, a second order, complex poles transfer function with the DC gain of 1 is no longer appropriate to
model the closed loop system.
It has to be modified by adding a multiplier factor to reflect a non-unit DC gain, as shown in Equation 12‑10.
The resulting frequency response for this model can be derived in the same way as before. However, since the
system transfer function has a non-unit DC gain, while the formula describing the resonant frequency , does
281 | 12.1 Model from Closed Loop Frequency Response
not change, the formula describing the maximum of the resonant peak in Equation 12‑4 has to be modified, as
shown in Equation 12‑11.

![이미지](images/page288_img00.webp)

Fig. 12-5: Locations of Dominant Closed Loop Poles
Equation 12‑10
Equation 12‑11
The damping ratio can be then found either by solving Equation 12‑11, or it can be estimated by a readout
from the plot shown in Figure 12‑6. Since magnitude frequency plots are most often shown in dB units, the ratio
can be read off in dB units from the plot as shown in Figure 12‑7 and then converted to V/V units. This allows
the proper calculation of the equivalent closed damping ratio , as shown in Equation 12‑12.
Equation 12‑12
Once the closed loop model described by Equation 12‑10 (system model parameters ) is estimated,
based on closed loop frequency response and assuming presence of the dominant complex poles, the
important closed loop step response specifications can also be estimated ( ).
12.1 Model from Closed Loop Frequency Response | 282

![이미지](images/page289_img00.webp)

Fig. 12-6: Relationship between Damping Ratio and Resonant Peak

![이미지](images/page289_img01.webp)

Fig. 12-7: Magnitude Plot of the Type Zero Closed Loop System
283 | 12.1 Model from Closed Loop Frequency Response
Note that while the closed loop frequency response may not always be directly available from measurements,
it can be computed based on the open loop frequency response, which usually is available. The calculations can
be easily performed using MATLAB, by converting the measured magnitude-phase data into a complex open
loop frequency function , and then by computing the closed loop frequency function and plotting it:
Equation 12‑13
12.1 Model from Closed Loop Frequency Response | 284
12.2 Model from Open Loop Frequency
Response
12.2.1 Phase Margin vs. Damping ratio
Consider again the closed-loop system in Figure 12‑1. The closed-loop transfer function is that of the standard
2nd order system with the DC gain equal to 1, shown in Equation 12‑1. The closed-loop system is type 1 – one
integrator in G(s). Let us now consider the open-loop system frequency response of that system:
Equation 12‑14
Let us find the system Phase Margin, , defined by Equation 11‑4. To find the frequency of crossover, the
open-loop gain in Equation 12‑15 is set to 1 (0dB), as per the definition of the Phase Margin, , shown in Figure
12‑8.
It will be shown that the Phase Margin, , relates to the closed-loop system transient performance (time-
domain). This relationship forms the basis of the classical controller design in the frequency domain.
Equation 12‑15
Equation 12‑16
285 | 12.2 Model from Open Loop Frequency Response

![이미지](images/page292_img00.webp)

Fig. 12-8: Definition of the Phase Margin
The formula for a quadratic solution is applied:
Equation 12‑17
Phase margin can now be found:
12.2 Model from Open Loop Frequency Response | 286
Equation 12‑18
This relationship looks quite complicated, however, when plotted in Figure 12‑9, a very simple approximation
becomes obvious:
Equation 12‑19

![이미지](images/page293_img00.webp)

Fig. 12-9: Phase Margin vs. Damping Ratio
For Phase Margins between 0 and 15 degrees, and between 55 and 60 degrees, this approximation is very
accurate. For Phase Margins between 15 and 55 degrees, as shown in Figure 12‑9, the actual value of the
damping ratio is below the straight line approximation and Equation 12‑19 can be slightly modified:
Equation 12‑20
287 | 12.2 Model from Open Loop Frequency Response
12.3 Summary
The Phase Margin, , is related to the equivalent closed loop damping ratio , which in turn determines
the Percent Overshoot of the step response. The relationship is almost linear, as shown in Figure 12‑9, and
can be approximated with a very simple linear proportionality in Equation 12‑19 and Equation 12‑20, valid for
:
The graph in Figure 12‑9 can be used to read off the Phase Margin – Damping Ratio values more accurately.
Once the damping ratio is estimated, Percent Overshoot of the closed loop step response can be estimated.
The crossover frequency relates to the frequency and therefore to the closed loop step response settling
time. The equations are based on a 2nd order model for the closed loop system. Note that:
Equation 12‑21
We can redefine settling time directly from Phase Margin and crossover frequency:
Equation 12‑22
Note that the crossover frequency for Phase Margin is approximately equal to the resonant frequency for the
closed loop transfer function, if damping ratio is small:
Equation 12‑23
Using this relationship gives us an alternative to finding the frequency of natural oscillations . Rather than
computing the closed loop frequency response, which may be tedious, and then reading off the resonant
frequency , we can estimate based on the open loop frequency plot and the value of the crossover
frequency, as shown in Equation 12‑23.
These observations are useful in moving back and forth between open loop frequency response, closed loop
frequency response and closed loop time (step) response. We will also assume that the higher order systems are
approximated well by a 2nd order model (dominant pair of complex poles will be assumed to exist in the closed
loop transfer function). Therefore all relationships derived for the 2nd order model here will be also applicable
for the higher order systems. Figure 12‑10 shows the relationship between open loop and closed loop frequency
responses.
See the plot in Figure 12‑10 for illustration.
12.3 Summary | 288

![이미지](images/page295_img00.webp)

Fig. 12-10: Estimate of the Resonant Frequency based on the Crossover frequency
289 | 12.3 Summary
12.4 Examples
12.4.1 Example
Recall Example 11.3.2 – we obtained linear approximations of the system process, G(s). Next, assume that the
process is to work in a unit feedback closed loop control system, with a Proportional Gain K = 1. Read off your plot
created in Example 11.3.2 values of the closed loop system Phase Margin and the corresponding frequency
of crossover, . Next, use the existing information to create a second order model for the closed loop system.
Based on your model, estimate the transient specifications of the closed loop step response, as well as error
specifications of the closed loop responses:
and . Finally,
consider the two traces shown on the plot – which one is the actual closed loop system response, and which
one is the model response?

![이미지](images/page296_img00.webp)

12.4.2 Example
A system is to operate in a unit feedback closed loop configuration and its parameters are not well known, but
the closed loop is understood to be stable. Standard frequency response tests are performed on the open loop
transfer function, with the controller gain set to 1, as shown:
12.4 Examples | 290

![이미지](images/page297_img00.webp)

Obtained open loop frequency response plots are shown below. Find two models for the closed loop system –
one based directly on the open loop plots, and one based on the closed loop frequency response (which will
have to be computed).

![이미지](images/page297_img01.webp)

12.4.3 Example
Consider again the unit feedback system under Proportional Control, K, from Example 2.6.12 where the process
transfer function G(s) was described as below:
Frequency response plots of the open loop when K = 1 are shown next.
From the open loop process frequency response, , determine the system Gain Margin Gm and Phase
Margin, , and the corresponding crossover frequencies. Is the closed loop system stable? What is the critical
291 | 12.4 Examples
gain, , at which the system will be marginally stable? What is the frequency of oscillations, , at that
gain? Compare your findings with Routh-Hurwitz Criterion results from Example 2.6.12. Next, based on the open
loop information, determine the approximate closed loop model of the system, , and its parameters,
, when proportional Gain K = 1.

![이미지](images/page298_img00.webp)

12.4.4 Example
A system is to operate in a unit feedback closed loop configuration, and its parameters are not well known, but
the closed loop is understood to be stable. Standard frequency response tests are performed on the open loop
transfer function, with the controller gain set to 1. Obtained open loop frequency response plots are shown next.
Find an appropriate closed loop model for the system.
12.4 Examples | 292

![이미지](images/page299_img00.webp)

12.4.5 Example
Consider again the closed loop system from Example 11.3.12. Assuming Controller Gain = 1, use the
information contained in the frequency response plots to derive two second order approximate models for the
closed loop system.
12.4.6 Example
Consider the unit feedback closed loop system under Proportional Control, where the process transfer function
G(s) is known:
Frequency response plots of the open and closed loop (assuming Controller Gain = 1) are shown below. Use the
information contained in the frequency response plots to derive two second order approximate models for the
closed loop system.
293 | 12.4 Examples

![이미지](images/page300_img00.webp)

Open Loop Frequency Response

![이미지](images/page300_img01.webp)

Closed Loop Frequency Response
12.4 Examples | 294
12.4.7 Example
Consider the unit feedback closed loop system under Proportional Control where the process transfer function
G(s) is given as:
Frequency response plots of the closed loop (note magnitude is in V/V) and the open loop (note magnitude
is in dB), both with the Controller Gain , are shown next. Use the information at hand to derive as many
second order approximate models for the closed loop system as you can think of. Next, use these models to
obtain estimates of the closed loop system step response, errors and error constants.

![이미지](images/page301_img00.webp)

Open Loop Frequency Response
295 | 12.4 Examples

![이미지](images/page302_img00.webp)

Closed Loop Frequency Response
12.4.8 Example
Consider again the following closed loop system from Example 11.3.11. Create a second order model for the
closed loop system and estimate the specifications of the CLOSED loop properties of the system (system step
response, error constants and errors).
12.4.9 Example
Consider again the system from Example 11.3.6. Consider the Root Locus Plot first to decide if a second order
model applies to the closed loop system. If the answer is yes, create an appropriate second order and estimate
the specifications of the CLOSED loop properties of the system (system step response, error constants and
errors).
12.4.10 Example
Consider the following closed loop system compensated by a LEAD Controller. The compensated and
uncompensated frequency response plots are shown next.
12.4 Examples | 296

![이미지](images/page303_img00.webp)

![이미지](images/page303_img01.webp)

The controller was designed to meet the following specifications: a) Closed loop steady state error to a RAMP is
to be 0.4 V/V, b) Closed loop step response is to have PO < 20% and < 5 seconds. Predict what
the uncompensated step and ramp response would look like. Investigate the feasibility of using a Proportional
Controller. Predict what the compensated step and ramp response would look like.
12.4.11 Example
Consider again the unit feedback system under Proportional Control, from the previous example. The
Proportional Gain was set to K = 5. Frequency response for the closed loop system was measured
experimentally, and its magnitude plot is shown. Note the magnitude is in V/V units. Based on the closed
297 | 12.4 Examples
loop data contained in the plot determine the approximate closed loop model of the system, , and its
parameters .
Next, consider now two responses shown in Figure below. One of them corresponds to the actual closed loop
system response, and the other to the model response, as it should have been derived in item above. Identify
which one is which and briefly explain why.

![이미지](images/page304_img00.webp)

12.4.12 Example
Consider a unit feedback system under Proportional Control. OPEN LOOP frequency response plots of KG(s)
when K = 1 are shown. When K = 1, determine the approximate CLOSED LOOP model of the system, ,
and its parameters: Next, consider that the actual closed loop system (with K = 1) has the following
poles: -1+j8.85, -1-j8.85 and -18.85. Based on the dominant pair of the closed loop poles, determine another
approximate CLOSED LOOP model of the system, , and its respective parameters Compare
the two models – are they similar? Which of the two models will be more accurate? Briefly explain why.
Pick the model which you consider the more accurate and based on it, estimate transient specifications
of the closed loop step response, as well as error specifications of the closed loop responses:
and the errors and error constants:
.
12.4 Examples | 298

![이미지](images/page305_img00.webp)

12.4.13 Example
Consider again the closed loop control system under Proportional Control from Example 11.3.17. Closed loop
frequency response plots of the system with are shown next. The closed loop transfer function of
the system, when has three poles: ,
, . Determine if the second order dominant poles model applies to the closed loop transfer
function and if so, derive its transfer function, in the standard form. Refer back to the
open loop Bode plots in Example 11.3.17 and determine the second order dominant poles model,
from the information provided in the plots. Determine the second order dominant poles model, from the
information provided in the closed loop Bode plot above. How do the three models compare? Use the one
you consider the most accurate to estimate the following closed loop step response specifications:
and PO.
299 | 12.4 Examples

![이미지](images/page306_img00.webp)

12.4 Examples | 300
CHAPTER 13
301 | Chapter 13
13.1 Basic Rules - Summary
Frequency Response-based design is based on several simple assumptions. Relationships between system
parameters ( ), open loop frequency response, closed loop frequency response and closed loop step
response are derived assuming that in most simple cases the closed loop system can be modeled reasonably
well by a second order model (dominant complex poles) even if the actual system dynamics are of a higher
order:
Phase Margin (found on Open Loop Frequency Response Plot) determines PO in Closed Loop Step Response

![이미지](images/page308_img00.webp)

Phase Margin, , identified on the open loop frequency response plot, affects the oscillations in the closed
loop step response. Recall that the accurate relationship is:
Use the accurate graph on the left. If the graph is not available, use an approximate relationship
for and or for
13.1 Basic Rules - Summary | 302

![이미지](images/page309_img00.webp)

Damping ratio in turn decides about the oscillations in the closed loop system step response, i.e. Percent
Overshoot:
Small corresponds to a small equivalent damping ratio that results in large oscillations (PO):

![이미지](images/page309_img01.webp)

![이미지](images/page309_img02.webp)

303 | 13.1 Basic Rules - Summary
A decent (45 – 65 degrees) corresponds to a decent damping ratio (0.4 – 0.7) and small oscillations (small
PO):

![이미지](images/page310_img00.webp)

![이미지](images/page310_img01.webp)

Frequency of Crossover (found on Open Loop Frequency Response Plot) determines Settling Time in Closed
Loop Response

![이미지](images/page310_img02.webp)

Crossover frequency for Phase Margin, (frequency at which the system open loop gain crosses the 0dB
line), affects the speed of the closed loop step response:
13.1 Basic Rules - Summary | 304
Notice that the Settling Time is inversely proportional to the crossover frequency, :
Small corresponds to slow responses in time domain, and large corresponds to fast responses in time
domain. Also notice that from the derivation for the Phase Margin, is equal to:
then:
This indicates that the crossover frequency \omega_{cp} (found on the open loop plot) and the resonant
frequency \omega_{r} (found on the closed loop plot) are practically identical.
Open loop DC Gain determines Steady State Errors in Closed Loop Response
Note that the best (most accurate) way to determine the closed loop step response error is to use an analytical
expression for an open loop transfer function, if available, since:
If an expression for the closed loop transfer function is available, we can use the closed loop DC gain as well:
If only a frequency plot is available, then the DC gain (open or closed loop) can be read off of it, but it will be not
as accurate, particularly if the scale is in dB. Any readout in dB will have to be converted to the V/V units before
the above formulae can be used.
SUMMARY
The general idea behind the frequency domain-based design is to shape the open loop frequency response so
that:
1. in 45-65 degrees range is achieved – so that the equivalent damping ratio of the closed loop is kept
within the 0.4 to 0.7 range, which in turn should result in a PO between 25% (for = 0.4) and 5% (for =
0.7).
2. is as large as possible – so that the equivalent closed loop frequency of natural oscillations large,
which in turn should result in short Settling and Rise Times;
3. Open Loop DC gain, , is as large as possible- so that the closed loop DC gain is as close to 1 as
305 | 13.1 Basic Rules - Summary
possible, which in turn will minimize the closed loop steady state error.
NOTE: because of the approximate nature of the modeling based on the assumption of a 2nd order
dominant poles model, all compensation designs based on it should be verified through simulation, and
fine-tuned if necessary.
13.1 Basic Rules - Summary | 306
13.2 Lead Controller
A transfer function of the lead compensator is a first order combination of a real pole block and a real zero block,
with an adjustable gain:
Equation 13‑1

![이미지](images/page313_img00.webp)

Figure 13-1: Pole Zero Map for Lead Compensator
corresponds to the DC gain of the controller, and (the zero is closer to Im axis than the pole).
Zero is at:
Pole is at:
In the frequency domain, the two corner frequencies are: ,
The magnitude is described as:
Equation 13‑2
307 | 13.2 Lead Controller
The phase is described by Equation 13‑2 and can be calculated from . Resulting in Equation 13-4.
Equation 13‑3
Equation 13‑4
Magnitude and phase plots are shown in Figure 13-2.
The maximum of phase lead occurs at the midpoint frequency as shown in Equation 13‑5:
Equation 13‑5
At this frequency the compensator gain is:
Equation 13‑6

![이미지](images/page314_img00.webp)

Figure 13‑2: Frequency Response for Lead Compensator
13.2 Lead Controller | 308
At the high frequency , in practical terms, when the compensator gain is:
Equation 13‑7
How to use the Lead Controller:
• Use the phase lead available from the lead parameter to correct deficiencies in the Phase
Margin
• Try to increase BOTH and
• Adjust as required
13.2.1 Simplified Lead Controller Design
For the simplified design, this form of the Lead Compensator is more convenient:
Equation 13‑8
Zero is at , pole is at . The design will involve first making a decision on what the
compensated system phase margin should be and at what frequency it should occur. Recall that the
phase margin is related to the equivalent closed loop damping ratio , which in turn determines the percent
overshoot of the step response:
Dynamic tracking requirements (PO spec) will then be translated into the required . Also recall that the
crossover frequency relates to the closed loop model frequency which in turn affects the closed loop step
response settling time:
Lead Compensator adds phase lead at the mid-point frequency as seen in Figure 13‑2. Dynamic tracking
309 | 13.2 Lead Controller
requirements (Settling Time spec) will then be translated into the required . Once is decided, we will
assume the maximum phase lift will be placed at this frequency to maximize the Phase Margin:
Equation 13‑9
Once is decided, calculate the compensator parameter from the maximum of the phase lead
needed:
Equation 13‑10
The compensator time constant can now be calculated:
Equation 13‑11
Remember that the additional magnitude added by the lead component at the mid-point frequency is equal
to , as shown in Figure 13‑2. This will shift the crossover frequency from its intended
position at , and will affect the Phase Margin. To re-adjust the crossover frequency, change the DC gain of
the controller, . Note that the resulting open loop gain may or may not meet the error specification.
NOTE:
This design is simple, but does not allow meeting the closed loop steady state error specification directly. When
the system is Type 1 and the step error is of no concern, this approach works best. Notice that since the DC
gain of the controller is adjusted last, to achieve at the same time an improvement in the system tracking
as well may require many trial-and-error iterations. This may prove tedious, or impossible, and so this simple
approach should be mainly used if improving the tracking accuracy is not important, for example, when the
system already has high error constants and therefore a good steady state tracking. This approach allows
meeting the design requirements w.r.t. damping (percent overshoot) and speed (settling time) with relatively
few calculations.
13.2.2 Analytical Lead Controller Design
When achieving the DC tracking accuracy is as important as the dynamic tracking, a different, more analytical
approach is recommended, which will allow to find a lead network with a specific DC gain, that will create a
specified Phase Margin at a specified crossover frequency, . Recall that the transfer function of the
lead compensator is:
Coefficient corresponds to the DC gain of the controller. Zero is at , pole is at , as
shown in Figure 13‑1. Dynamic tracking requirements dictate what values of the Phase Margin and of the
crossover frequency should be chosen. Ideally, we want to have the specified Phase Margin to occur
at the specified frequency . Note that the new crossover frequency should be chosen to be larger than
the uncompensated one. The condition is written as:
13.2 Lead Controller | 310
Equation 13‑12
The above complex equation results in two conditions (magnitude and phase), with two unknowns, and :
Equation 13‑13
The two equations can be then solved. It is convenient to define the following “Phase Lift” angle :
Equation 13‑14
The Lead Controller coefficients are then calculated as:
Equation 13‑15
Observation I:
Note that although the solution to these equations will always exist, not all solutions will be acceptable. If
is negative, the Lead Controller will be non-minimum phase. If is negative, the Lead Controller is unstable.
If either of these cases occurs, the initial choices of , have to be modified until positive solutions are
found.
Observation II:
Note that if for the compensated system is chosen to be less than that of the uncompensated system, we
will end up with a Lag Controller transfer function, shown in Equation 13‑16, where corresponds to
the DC gain of the controller, and (i.e. the controller pole is closer to Im axis than the zero).
311 | 13.2 Lead Controller
13.3 Lead Controller Design – Solved
Examples
13.3.1 Lead Controller Design – Solved Example 1
Consider a typical unit feedback closed loop control system, as shown, which is to operate under Lead Control.

![이미지](images/page318_img00.webp)

The Lead Controller transfer function is as follows:
Where is the so-called Lead Time Constant and The process transfer function G(s) is:
Open loop frequency response plots of G(s) are shown in Figure 13‑3. The closed loop performance requirements
are: the Steady State Error for the unit step input for the compensated closed loop system is to be no more than
2%; Percent Overshoot of the compensated closed loop system is to be no more than 15%; the Settling Time,
, is to be no more than 5 seconds – preferably less.
Check what the current (uncompensated system) values of the Phase Margin, , and the Crossover
Frequency, , are. Estimate the uncompensated closed loop step response specs: Percent Overshoot, PO,
Steady State Error, , and Settling Time, . Next, based on the specifications, calculate the
required values of the Phase Margin for the compensated system, , and the DC gain of the controller, .
Design the Lead Controller such that it meets the closed loop response requirements, and write the Lead
Controller transfer function and its parameters. For your Controller, estimate the compensated closed loop step
response specs: Percent Overshoot, PO, Steady State Error, , Rise Time, , and Settling
Time, .
13.3 Lead Controller Design – Solved Examples | 312

![이미지](images/page319_img00.webp)

Figure 13-3: Uncompensated Open Loop Frequency Response in Lead Design Example 1 – Gain and Phase Margins
SOLUTION:
Let’s start by finding the open loop DC gain – note that reading the gains off the Bode plots is difficult due to
decibel units – here the gain could be read off from Figure 13‑3 as somewhere close to 20 dB. It is therefore
preferable to use the transfer function, if available, to compute the accurate gain values. Here we can compute
the Uncompensated Open Loop DC gain – there is no controller, i.e. – from the process transfer
function:
The uncompensated closed loop DC gain is then:
The Phase Margin and the crossover frequency can be read off from the Bode plot in Figure 13‑3 as:
and rad/sec. The damping ratio and the frequency of natural oscillations for the
uncompensated closed loop system can now be estimated by either reading it off the Phase Margin graph in
Figure 12‑9, or by using the formula:
313 | 13.3 Lead Controller Design – Solved Examples
The uncompensated closed loop model based on the Open Loop Frequency Response is then:
Model specs can be calculated as:
The closed loop transfer function has a dominant pair of complex poles, with the damping ratio and
the natural frequency of oscillations rad/sec, which are close to the model estimates: ,
rad/sec. The actual transfer function also has a real pole at – 5.02, which is negligible, compared to
the dominant pair of closed loop poles at . Thus, the assumed model is quite accurate – see
the actual step response comparison, shown in Figure 13‑4, Figure 13‑30, and the calculated specs.
13.3 Lead Controller Design – Solved Examples | 314

![이미지](images/page321_img00.webp)

Figure 13-4: Uncompensated Closed Loop Step Response in Lead Design Example 1
Actual specs, compared to the model specs (based on uncompensated Open Loop Bode plots), are:
– Model for the
Actual Uncompensated System
Uncompensated System
PO 41% 37%
9.1% 9.1%
6.0 sec 6.0 sec
42.0 sec 40.4 sec
The specs estimates from the model are very accurate, with all specs meeting the required values.
Now, the Lead Controller design – we can choose a simplified design or an analytical design. First, always
calculate the required DC gain of the controller – this part is the same in both approaches.
Based on the required error specification:
315 | 13.3 Lead Controller Design – Solved Examples
The compensated closed loop DC gain should be:
The controller DC gain is then:
Next, “translate” the required PO spec into the equivalent closed loop damping ratio.For PO = 15%, the required
damping ratio, based on Figure 7‑4, is . The compensated Phase Margin should be, based on Figure
12‑9: . Let’s round off the Phase Margin to: . Next, “translate” the required
Settling Time spec into the equivalent closed loop frequency of natural oscillations:
That frequency can then be “translated” into the minimum required Phase Margin crossover frequency:
What do we do next? The two approaches differentiate on how we proceed.
13.3.1.1 Lead Controller Design Solved Example 1: The “Simplified” Lead Design
Based on the required PO spec, let’s decide on the “good” Phase Margin for the compensated system – it
will be . Next, based on the required Settling Time spec, let’s decide on a “good” crossover
frequency – let us pick . Remember that it is an arbitrary choice that does not guarantee that the
solution is the “best”, or “optimal”. It will result in one possible improvement of the system response. Note that
in the Lead Design, the compensated crossover frequency will always be to the right of the uncompensated
frequency of the crossover. If it were to the left of the uncompensated frequency of the crossover, we would
end up with a Lag Design.
At the chosen frequency of 1.5 rad/sec, we need to find the magnitude and phase of the original system G(s).
Recall that reading values off the dB plot is notoriously inaccurate, and thus it is better to substitute
into the transfer function G(s) to obtain more accurate values of magnitude and phase:
Recall that we are gaining the most phase “lead” at the mid-point frequency of the Lead Controller (see the
graph below). That mid-point will become our intended compensated crossover frequency, at which the Phase
Margin will be measured. If we want to , then the required “phase lift” at would
be:
13.3 Lead Controller Design – Solved Examples | 316

![이미지](images/page323_img00.webp)

We will get that phase lift from the largest phase gain of the Lead Controller:
The mid-point frequency of the Lead Controller is equal to 1.5 rad/sec:
As seen on the plot, there is a gain increase at the mid-point frequency of the Lead Controller, equal to:
Further, remember that since we are going to use the DC gain of 4.9, the new total gain at the chosen crossover
frequency of 1.5 is going to be the original gain of multiplied by 4.9 and by 4.34:
To make that point the compensated crossover frequency, the total “new” gain has to be equal 0 dB (1 V/V) –
thus we can calculate the additional required adjustment of the DC gain of the controller equal to 1/0.9. The
total DC gain of the controller is equal to 4.9/0.9 = 5.43. Note that, should the adjustment require a reduction of
the controller DC gain, we would not be meeting the error specs, which would require reconsidering our choice
of the crossover frequency.
The controller transfer function is:
317 | 13.3 Lead Controller Design – Solved Examples
The open loop Bode plots before and after compensation and the system Phase Margin are shown in Figure
13‑22 and the compensated Phase Margin is shown in – it is at the frequency of
rad/sec, as was chosen for this design.

![이미지](images/page324_img00.webp)

Figure 13‑5: Open Loop Frequency Responses in Lead Design Example 1 – Simplified Design
The expected compensated closed loop response specs can be estimated using the dominant poles model
again. Use the formula or read off the Phase Margin graph:
The compensated open loop gain:
The compensated closed loop gain:
13.3 Lead Controller Design – Solved Examples | 318
The compensated closed loop model:

![이미지](images/page325_img00.webp)

Figure 13‑6: Compensated Phase Margin in Lead Design Example 1 – Simplified Design, Gain and Phase Margins
Model specs can be calculated as:
The actual closed loop transfer function is:
319 | 13.3 Lead Controller Design – Solved Examples
As we can see, the actual closed loop transfer function has a dominant pair of complex poles at
, with the damping ratio and the natural frequency of oscillations rad/sec, as well as a
zero at -0.3453 and two real poles at –8.33 and at -0.3924. The dominant poles model is not as accurate as before,
because now an additional pole-zero combo shows up, closer to the Imaginary axis than the real coordinate of
the dominant pair, and they do not totally cancel out. Their net residual effect on the closed loop response is
that the there is a slight additional overshoot caused by the zero, and the Settling Time is actually a bit slower
than expected – see the actual step response comparison in Figure 13‑7 and the comparison of the specs below.
Actual specs, compared to the model specs (based on compensated Open Loop Bode plots), are:
– Model for Compensated Actual Compensated Compensated
System System
PO 13.3% 16.8%
1.8% 1.8%
1.29 sec 1.25 sec
3.7 sec 5.5 sec
We could try to improve on this design by trying a different choice of the crossover frequency. The biggest
problem is that a different choice of the crossover frequency may require us to make a final adjustment to the
DC gain of the open loop (the one we need to make the total open loop gain equal to 0 dB at the crossover
frequency) to be less than 1, and that will cause us to miss the steady state specs, requiring yet another iteration.
However, it is much easier to meet all conditions using the analytical design formulae, which we will try next.
Plus of the simplified design – it will never lead to negative values of the controller parameters,
which may happen with the Analytical Lead Design.
Minus of the Simplified Lead Design – some choices of the crossover frequency may result in the
final adjustment of the open loop DC gain that will not meet the error specs. As well, Lead Design
always results in adding a zero to the closed loop transfer function that is not totally cancelling out
and thus is affecting the shape of the closed loop response by increasing its PO. The solution to both
these problems is a trial & error approach to finding an acceptable set of controller parameters, but
it is tedious.
13.3 Lead Controller Design – Solved Examples | 320

![이미지](images/page327_img00.webp)

Figure 13‑7: Compensated Closed Loop Step Response in Lead Design Example 1 – Simplified Design
13.3.1.2 Lead Controller Design Solved Example 1: The “Analytical” Lead Design
The analytical design gives us more flexibility to shape the open loop response by choosing different locations
for the crossover frequency and quickly checking the resulting open loop parameters and the closed loop
response.
Remember that the first step is always to choose the required DC gain based on the error specs – the
calculations are identical to the simplified method, so the Controller DC gain ( ) will be the same.
Based on the required error specification:
The compensated closed loop DC gain should be:
321 | 13.3 Lead Controller Design – Solved Examples
The controller DC gain is then:
Next, we pick the Phase Margin – in this example, we decided to have the Phase Margin of , so let’s stick with
this value. Next, we need to choose the crossover frequency – as long as it is more than 0.3 (the uncompensated
value). First, let’s choose the same value as in the simplified design:
To use the derived formulae for the controller constants and , we need to find the uncompensated open
loop Bode plot the phase and the gain at that frequency. Recall that reading values off the dB plot is notoriously
inaccurate, and thus it is better to substitute into the transfer function G(s) to obtain more accurate
values of magnitude and phase – we already did that for the simplified design:
Next, substitute these values into the formulae:
Note that the “lift” angle is similar to the “maximum phase lift” in the simplified design, except that we don’t
need to choose just this one maximum value, as you will see later. Next, we substitute the values into the
Analytical Design formulae:
These values are very close to the ones obtained using the simplified approach, as expected. The closed loop
response will also be similar. Recall that that design had more Percent Overshoot than expected, and a longer
Settling Time, so let us look for an improvement.
With the analytical design we can easily choose a different frequency of the crossover (as long as it is more
than the uncompensated crossover frequency of 0.3 rad/sec) and see if the resulting closed loop step response
simulations will improve. Knowing that the Lead design causes more PO than expected, we can also
overcompensate slightly for it by making the Phase Margin larger than the dominant poles model suggests.
Let’s say, make rad/sec and . Again, we need to find the gain of the
uncompensated system at that frequency (1.8 rad/sec) – recall that reading it off the graph is inaccurate so it is
best to substitute into G(s):
Next, substitute these values into the formulae:
13.3 Lead Controller Design – Solved Examples | 322
Here we see that the controller coefficients are acceptable, both being positive. Recall that the controller pole in
RHP would be unacceptable, because it means an unstable open loop transfer function – even if the resulting
closed loop is stable, for safety reasons we do not want to implement that – in case if the closed loop incidentally
opens (a malfunction), we would have an unstable system on our hands. The RHP location of the controller zero
would also be unacceptable – even if the controller pole is in a stable location, the RHP zero will introduce an
effective delay into the system, extending both the Rise Time and the Settling Time. Recall that we will never
get that kind of surprise in the “simplified” lag design. Let’s check the compensated system response. The open
loop Bode plots before and after compensation are shown in Figure 13‑8 and the system Phase Margin is shown
in Figure 13‑9. The controller transfer function is:
The expected compensated closed loop response can be estimated using the dominant poles model again. Use
the formula or read off the Phase Margin graph in Figure 12‑9:
The compensated closed loop model:
Model specs can be calculated as:
323 | 13.3 Lead Controller Design – Solved Examples

![이미지](images/page330_img00.webp)

Figure 13‑8: Open Loop Frequency Responses in Lead Design Example 1 – Analytical Design
The actual closed loop transfer function:
Note that the closed loop model based on the dominant poles is now more accurate than in the case of the
“simplified” design – while the additional pole-zero combo still shows up, both closer to the Imaginary axis than
the complex pair of poles at , their net effect on the closed loop response is almost negligible
because of a much better “near-cancellation”: we have a zero at -0.2551, and a pole at -0.2688. Before they were
at -0.3453 and at -0.3924, respectively.
13.3 Lead Controller Design – Solved Examples | 324

![이미지](images/page331_img00.webp)

Figure 13‑9: Compensated Phase Margin in Lag Design Example 1 – Analytical Design
See the actual step response comparison in Figure 13‑10 and the comparison of the specs below. The actual
specs, compared to the model specs (based on compensated Open Loop Bode plots), are:
– Model for
Actual Compensated System
the Compensated System
PO 10.5% 8.8%
2% 2%
1.1 sec 1.1 sec
12.1 sec 5.5 sec
Finally, let’s see how much of an improvement we achieved by introducing the Lead Controller – see the
comparison of the responses in Figure 13‑11. The only spec that differs from the model is the Settling Time. This
is due to an additional pole in the transfer function close to the significant region, and the not-perfect pole-zero
cancellation. These two additional poles and the zero affect the system response. The not-exactly cancelled zero
increases the Percent Overshoot, and the two poles slow down the Settling Time.
325 | 13.3 Lead Controller Design – Solved Examples

![이미지](images/page332_img00.webp)

Figure 13‑10: Compensated Closed Loop Step Response in Lead Design Example 1 – Analytical Design
Plus of the Analytical Lead Design – it can be quickly iterated to find a much better system
performance, without compromising any of the specifications, including the DC gain, which may
happen with the Simplified Lead Design.
Minus of the Analytical Lead Design – sometimes the design formulae will yield negative, i.e.
unacceptable, values of controller parameters. This can be addressed by a slightly different choice of
the crossover frequency and the phase margin.
13.3 Lead Controller Design – Solved Examples | 326

![이미지](images/page333_img00.webp)

327 | 13.3 Lead Controller Design – Solved Examples
Figure 13‑11: Comparison of Closed Loop Step Responses in Lead Design Example 1
13.3.2 Lead Controller Design – Solved Example 2
Consider another unit feedback closed loop control system (see previous example), which is to operate under
Lead Control. The process transfer function G(s) is:
Open loop frequency response plots of G(s) are shown in Figure 13‑12. The closed loop performance
requirements are: the Steady State Error for the unit step input for the compensated closed loop system is to be
equal to 1%; Percent Overshoot of the compensated closed loop system is to be no more than 15%; the Settling
Time, , is to be no more than 0.3 seconds, and the Rise Time, , is to be no more than
0.1 seconds.

![이미지](images/page334_img00.webp)

Figure 13‑12: Uncompensated Open Loop Frequency Response in Lead Design Example 2 – Gain and Phase margins
13.3 Lead Controller Design – Solved Examples | 328
Let’s start with an estimate of the uncompensated closed loop step response specs: , ,
and .
Estimates of the uncompensated system step error can be calculated directly from the Position Constant:
Or, we can use the closed loop DC gain:
Let’s check the model for the uncompensated system – from open loop Bode plots, the Phase Margin is so
large ( ), the formulas clearly do not apply – it will give you a damping ratio close to 1 – the
system is overdamped! We have to default to the transfer function calculations of the dominant poles model –
fortunately, we can use Matlab to do the heavy lifting:
The uncompensated closed loop system has one real pole and two complex poles with the damping ratio
almost equal to 1: -50.1, ( ). This is NOT an underdamped dominant poles model!
We can have the model based on the one DOUBLE dominant real pole – critical damping ( ) – see the
step response of the actual uncompensated closed loop system and of the 2nd order model, shown in Figure
13‑13.
Estimates from the model:
Note it is difficult to estimate the Rise Time for a critically damped system. One way would be to assume
. Check with “stepeval” what the actual specs are: , sec,
sec, .
329 | 13.3 Lead Controller Design – Solved Examples

![이미지](images/page336_img00.webp)

Figure 13‑13: Uncompensated Closed Loop Step Response in Lead Design Example 2 – Actual System vs. Model
Next, decide on the DC gain of the Controller ( ) that would meet the design requirements. Calculate the DC
gain of the controller, – for the error to be 1%:
From that we can calculate the DC gain of the controller transfer function, :
Decide what value of the Phase Margin for the compensated system ( ), and what value of the crossover
frequency for the compensated system ( ), would meet the design requirements. To figure out the
compensated system Phase Margin and frequency of the crossover, we should look at the “desired” values of
the closed loop dominant poles model – check the plot of PO vs. damping ratio in Figure 7‑4.
13.3 Lead Controller Design – Solved Examples | 330
We can now put together the model for the compensated closed loop system:
Let’s check if this choice of and will also result in an acceptable Rise Time:
This is fine, so the next step is to “translate” the closed loop model parameters into the Phase Margin and
crossover frequency: based on Figure 12‑9 we have: Next, solve for the required
crossover frequency:
Alternatively, we can use this formula:
Let’s pick the values of and rad/sec, and Next, the appropriate
Controller parameters and clearly write the Lead Controller transfer function, . We will use the analytical
design formulae, but first we need to compute open loop gain and phase values at the chosen frequency of the
crossover – we will use Matlab to obtain accurate values, as reading them off the graph may be too rough; see if
you can read off the value close to -40 dB directly off the open loop Bode plot in Figure 13‑12. Matlab values are
shown in Figure 13‑14.
We can now compute the “lift” angle:
331 | 13.3 Lead Controller Design – Solved Examples

![이미지](images/page338_img00.webp)

Figure 13‑14: Uncompensated Open Loop Frequency Response in Lead Design Example 2 – Readouts at
Apply the formulae:
The Lead Controller transfer function coefficients are both positive, so the transfer function is acceptable! Let’s
have a look at the compensated vs. uncompensated open loop Bode plots in Figure 13‑15. You can clearly see the
characteristic shape of the open loop compensation – the increased open loop DC gain, the increased Phase
Margin and crossover frequency. We can check the obtained values by using the “margin” function in Matlab,
as shown in Figure 13‑21.
and
13.3 Lead Controller Design – Solved Examples | 332

![이미지](images/page339_img00.webp)

Figure 13‑15: Compensated Open Loop Frequency Response in Lead Design Example 2
Next, estimate the compensated closed loop step response specs: PO, , , and
.
The estimated specs are going to be as expected, since we created the compensated closed loop system model
based on these:
, ,
Thus, we expect these estimates, as per model:
333 | 13.3 Lead Controller Design – Solved Examples
,

![이미지](images/page340_img00.webp)

Figure 13‑16: Compensated Open Loop Frequency Response in Lead Design Example 2 – Gain and Phase Margins
Let’s now check if the closed loop response conforms to these expectations. The compensated open loop
system transfer function is:
The closed loop system transfer function is:
The dominant pair of complex poles is at: . Based on the closed loop transfer function, we
can expect a near-pole-zero cancellation weakening the effect on the significant pole-zero pair at -7 and -7.78
respectively; the pole at -139.9 is not insignificant either but it should counteract the effect of the not-entirely
cancelled zero. Conclusion – the actual compensated system response should be very similar to the predicted
model. This is confirmed by the plots in Figure 13‑17. The actual system response, despite the presence of an
13.3 Lead Controller Design – Solved Examples | 334
extra pole and an extra zero, is not that different from the expected response, confirming the validity of this
approach.

![이미지](images/page341_img00.webp)

Figure 13‑17: Compensated Step Response (Actual System vs. 2nd Order Model) in Lead Design Example 2
Below, we compare the expected specs, based on the model, with the actual system response specs, obtained
by running the “stepeval” function. The actual specs, compared to the model specs, are:
335 | 13.3 Lead Controller Design – Solved Examples
Actual Compensated
– Model for
System the Compensated System
PO 14.9% 15%
1% 1%
0.093 sec 0.1 sec
0.24 sec 0.3 sec
The specs estimates from the model are very accurate, with all specs meeting the required values.
13.3 Lead Controller Design – Solved Examples | 336
13.4 Lag Controller
A transfer function of the Lag Controller is as follows, where corresponds to the DC gain of the
controller, and – the pole is closer to Im axis than the zero:
Equation 13-16
Zero is at , pole is at as shown in Figure 13‑18.

![이미지](images/page343_img00.webp)

Figure 13‑18: Pole Zero Map for Lag Compensator
In the frequency domain, the two corner frequencies are: ,
The magnitude is described as:
Equation 13‑17
The phase is described as:
337 | 13.4 Lag Controller
Equation 13‑18
The approximate end of the phase lag occurs at the frequency:
Equation 13‑19
This frequency then will be positioned over the chosen crossover frequency . The gain drop added by the
lag component (with respect to its DC gain level) is equal to:
Equation 13‑20
Frequency response plots of the Lag Controller (without its DC gain, ) are shown in Figure 13‑19.
How to use the Lag Controller:
• Use the Lag Controller gain, to correct deficiencies in the steady state tracking.
• Use the Lag Controller parameter to adjust the dynamic gain for the correct crossover
and Phase Margin .
• Adjust as required.
13.4 Lag Controller | 338

![이미지](images/page345_img00.webp)

Figure 13‑19: Frequency Response of Lag Compensator
13.4.1 Simplified Lag Controller Design
For the simplified design, this form of the Lag Compensator is more useful:
Equation 13‑21
Zero is at , pole is at as shown in Figure 13‑18. The design will involve making a decision
on what the compensated system phase margin should be and what the steady state tracking accuracy
should be. The lag network contributes negative angle, so it has to be positioned over the frequency response of
a process to be compensated in such way that its angle contribution to the overall compensated angle is zero.
Otherwise, if the compensated phase angle at the crossover frequency is reduced, the system will have a
smaller phase margin, and thus the equivalent damping ratio of the closed loop system will be worse.
Steps involved in the compensation process are as follows. First the open loop frequency response is adjusted
by the required DC gain (determined based on the steady state error requirements).
339 | 13.4 Lag Controller
Next, from the plot of the open loop frequency response, , the frequency of crossover is chosen such
that an appropriate phase margin (plus an extra 5 degrees) can be provided by the process phase itself:
Equation 13-22
Once this frequency is determined, the Lag Controller parameter is calculated based on the gain drop required.
Finally, since the end of the lag phase of the Lag Controller is at the crossover frequency, we have:
Equation 13-23
The simplified design is simple, but does not allow meeting the speed specification. If a condition on
the Settling or Rise Time is imposed, Lead Controller is always a better choice. A major problem with
it is that it tends to generate a very long time constant associated with the Lag Controller, which
adversely affects the Settling Time specification.
13.4.2 Analytical Lag Controller Design
An alternative approach to the Lag Controller is to use the same design equations as for the Lead Controller,
with the new crossover frequency chosen to be smaller than the uncompensated one. For the analytical
design, this form of the Lag Controller is used:
Equation 13-24
Note that corresponds to the DC gain of the controller. Zero is at , pole is at .
Equation 13-25
Calculate the Lag Controller coefficients:
Equation 13-26
Observation I:
The same as in case of Lead Controller: if either coefficient < 0, iterations are necessary.
Observation II:
Note that if for the compensated system is chosen to be larger than that of the uncompensated system,
we will end up with a Lead Controller (where the zero is closer to Im axis than the pole).
13.4 Lag Controller | 340
13.5 Lag Controller Design – Solved
Example 1
Consider a typical unit feedback closed loop control system, as shown, which is to operate under Lag Control.

![이미지](images/page347_img00.webp)

The Lag Controller transfer function is as follows:
Where is the so-called Lag Time Constant and . The process transfer function G(s) is:
Open loop frequency response plots of G(s) are shown in Figure 13‑20. The closed loop performance
requirements are: the Steady State Error for the unit step input for the compensated closed loop system is one
half of the Steady State Error for the uncompensated system; Percent Overshoot is approximately 10%.
Check what the current (uncompensated system) values of the Phase Margin, , and the Crossover
Frequency, are. Estimate the uncompensated closed loop step response specs: Percent Overshoot, PO,
Steady State Error, , and Settling Time, . Next, based on the specifications, calculate the
required values of the Phase Margin for the compensated system, , and the DC gain of the controller, .
Design the Lag Controller such that it meets the closed loop response requirements, and write the Lag
Controller transfer function and its parameters. For your Controller, estimate the compensated closed loop step
response specs: Percent Overshoot, PO, Steady State Error, , Rise Time, , and Settling
Time, .
Let’s start by finding the open loop DC gain – note that reading the gains off the Bode plots is difficult due
to decibel units – here the gain could be read off from Figure 13‑20 as anywhere between 20 and 25 dB. It is
recommended to always use the transfer function (if available) to compute the accurate gain values. Here we
can compute the Uncompensated Open Loop DC gain – there is no controller, i.e. .
From the process transfer function:
341 | 13.5 Lag Controller Design – Solved Example 1

![이미지](images/page348_img00.webp)

Figure 13‑20: Uncompensated Open Loop Frequency Response in Lag Design Example
The uncompensated closed loop DC gain is then:
The Phase Margin and the crossover frequency can be read off from the Bode plot in Figure 13‑20 as:
and rad/sec. The damping ratio and the frequency of natural oscillations for
the uncompensated closed loop system can now be estimated by either reading it off the Phase Margin graph
in Figure 12‑9, or by using the formula: . Next, calculate the natural frequency:
The uncompensated closed loop model:
Model specs can be calculated as:
13.5 Lag Controller Design – Solved Example 1 | 342
The actual closed loop uncompensated transfer function is:
As we can see, the closed loop transfer function has a dominant pair of complex poles, with the damping ratio
and the natural frequency of oscillations rad/sec, which are very close to the model
estimates of and rad/sec. The actual transfer function also has a zero at -2, and two
poles at – 21.14 and -18.8, all of which are negligible, compared to the dominant pair of closed loop poles located
at .Thus, the assumed model is quite accurate – see the actual step response comparison,
shown in Figure 13‑21.
Below, we compare the expected specs, based on the model, with the actual system response specs, obtained
by running the “stepeval” function. The actual specs, compared to the model specs, are:
– Model for the
Actual Compensated System
Compensated System
PO 54.8% 31%
6.25% 6.25%
4.68 sec 4.82 sec
The specs estimates from the model are very accurate, with all specs meeting the required values.
343 | 13.5 Lag Controller Design – Solved Example 1

![이미지](images/page350_img00.webp)

Figure 13‑21: Uncompensated Closed Loop Step Response in Lag Design Example
Now, the Lag Controller design – we can choose a simplified design or an analytical design. First, always
calculate the required DC gain of the controller – this part is the same in both approaches. Based on the
required error specification:
The compensated closed loop DC gain should be:
The controller DC gain is then:
Next, “translate” the required PO spec into the equivalent closed loop damping ratio. Based on Figure 7‑4, for
13.5 Lag Controller Design – Solved Example 1 | 344
PO = 10%, the required damping ratio is approximately: . The compensated Phase Margin, based on
Figure 12‑9should be close to .
What do we do next? The two approaches differentiate on how we proceed.
13.5.1.1 Lag Controller Design Solved Example 1: The “Simplified” Lag Design
Recall that at the frequency of in the Lag Controller (see the graph below), we are still losing about of
phase, so look at the uncompensated open loop Bode plot and choose the frequency where the phase angle is
( ) away from the line. Here, if we want the compensated Phase Margin to be , we
should look for the frequency where the phase angle reaches :
That frequency is read off the plot as approximately 0.17 rad/sec: rad/sec. Note that in
the Lag Design, the compensated crossover frequency will always be to the left of the uncompensated
frequency of the crossover. If it were to the right of the uncompensated frequency of the crossover, we
would end up with a Lead Design. Here the uncompensated frequency is 0.38 rad/s. Next find the gain of the
uncompensated system at that point – recall that reading it off the graph is inaccurate so it is best to substitute
into G(s):
345 | 13.5 Lag Controller Design – Solved Example 1

![이미지](images/page352_img00.webp)

Remember that since we are using the DC gain of 2.0667, the total gain at the chosen crossover frequency is
going to be 3.87 times 2.0667. This is the amount of the gain reduction that has to be delivered by the high
frequency gain drop-off of the Lag Controller:
rad/sec becomes the right-side corner of the phase characteristic:
The controller transfer function is:
The open loop Bode plots before and after compensation and the system Phase Margin are shown in Figure
13‑22 and the compensated Phase Margin is shown in Figure 13‑23 – it is at the frequency of
rad/sec, as was chosen for this design.
13.5 Lag Controller Design – Solved Example 1 | 346

![이미지](images/page353_img00.webp)

Figure 13‑22: Open Loop Frequency Responses in Lag Design Example – Simplified Design
347 | 13.5 Lag Controller Design – Solved Example 1

![이미지](images/page354_img00.webp)

Figure 13‑23: Compensated Phase Margin in Lag Design Example – Simplified Design
The expected compensated closed loop response specs can be estimated using the dominant poles model
again. Use the formula below, or read off the Phase Margin graph in Figure 12‑9:
The compensated closed loop model:
Model specs can be calculated as:
13.5 Lag Controller Design – Solved Example 1 | 348
The actual closed loop transfer function is:
As we can see, the actual closed loop transfer function has a dominant pair of complex poles, with the damping
ratio and the natural frequency of oscillations rad/sec, as well as a zero at -2, another
zero at -0.017, and three real poles at – 20.59, -19.4 and at -0.01463.
The dominant poles model is not as accurate as before, because now an additional pole-zero combo shows up,
and both are very close to the Imaginary axis. They do not cancel out, and their net effect on the closed loop
response is that the very large time constant associated with the Lag Controller causes a very slow, very visible
exponential component in the step response – see the actual step response comparison in Figure 13‑24 and the
comparison of the specs below. That additional real pole has a very long decay time associated with it, which
significantly affects the Settling Time.
Below, we compare the expected specs, based on the model, with the actual system response specs, obtained
by running the “stepeval” function. The actual specs, compared to the model specs, are:
– Model for the
Actual Compensated System
Compensated System
PO 4.6% 9%
3.125% 3.125%
14.1 sec 11.5 sec
130.4 sec 24.8 sec
Clearly, the biggest problem with the simplified approach is that it typically generates a long time constant that
causes the closed loop system to have the real pole close to the Imaginary axis that cannot be ignored – the
closed loop model is not really based on a dominant pair of complex poles alone. Unfortunately, the simplified
design does not allow us to avoid this. Let’s consider the analytical design next.
Plus of the simplified design – it will never lead to negative values of the controller parameters.
Minus of the simplified design – it almost always results in an additional significant closed loop pole
that has a strong negative effect on the Settling Time. This can be somehow ameliorated by trial &
error adjustments, but it would be tedious.
349 | 13.5 Lag Controller Design – Solved Example 1

![이미지](images/page356_img00.webp)

Figure 13‑24: Compensated Closed Loop Step Response in Lag Design Example – Simplified Design
13.5.1.2 Lag Controller Design Solved Example 1: The “Analytical” Lag Design
The analytical design gives us more flexibility to shape the open loop response by choosing different locations
for the crossover frequency. Remember to choose the required DC gain based on the error specs – the
calculations are identical to the simplified method, so the Controller DC gain ( ) will be the same:
The compensated closed loop DC gain should be:
The controller DC gain is again:
13.5 Lag Controller Design – Solved Example 1 | 350
Next, we pick the Phase Margin – in this example, we decided to have the Phase Margin of , so let’s stick with
this value. Next, we need to choose the crossover frequency – as long as it is less than 0.38 (the uncompensated
value). First, let’s choose the same value as in the simplified design:
To use the derived formulae for the controller constants and , we need to calculate the uncompensated
open loop Bode plot the phase and the gain at that frequency – as before, substitute into the
transfer function G(s):
Next, substitute these values into the formulae:
Note since this is a LAG design, the “lift” angle is not really “lifting” anything; it is just an intermediate step in the
calculation, and could be even called a “drag” or “lag” angle. Also note this calculation confirms our assumption
in the “simplified” design that at the chosen crossover frequency, we are losing approximately 5 degrees of
phase to the lag controller.
These values are very close to the ones obtained using the simplified approach, as expected. The closed loop
response will also be similar, with the large value of the closed loop time constant dominating the response and
adversely affecting the Settling Time. The resulting design offers some improvement over the uncompensated
response, but the Settling Time spec takes a huge beating – this is not a good design and we should be able to
do better.
With the analytical design we are not stuck with the one choice of the crossover frequency, as is the case with
the simplified design. We can easily choose a different frequency of the crossover (as long as it is less than
the uncompensated crossover frequency) and see if the resulting closed loop step response simulations will
improve. Let’s consider what would happen if we chose a different value for the crossover frequency. Let’s say,
make rad/sec. Again, we need to find the gain of the uncompensated system at that point –
recall that reading it off the graph is inaccurate so it is best to substitute into G(s):
Next, substitute these values into the formulae:
351 | 13.5 Lag Controller Design – Solved Example 1
So here we have an unpleasant surprise! The controller coefficients are not acceptable, as they are negative! The
controller pole in RHP is unacceptable, because it means an unstable open loop transfer function – even if the
resulting closed loop is stable, for safety reasons we do not want to implement that – in case if the closed loop
incidentally opens (a malfunction), we would have an unstable system on our hands. The RHP location of the
controller zero is also unacceptable. Even if the controller pole is in a stable location, the RHP zero will introduce
an effective delay into the system, extending both the Rise Time and the Settling Time. Recall that we will never
get that kind of surprise in the “simplified” lag design.
Let’s keep adjusting the value of the crossover frequency – we already have one “passable” value, at 0.17 rad/
sec, but we want to improve on that design. By “trial & error” we find that values of crossover frequency
that are between 0.19 and 0.38 all result in negative coefficients and are therefore unacceptable. Let’s try
frequencies smaller than 0.17 – some of those choices will lead to acceptable controller values. Let’s see if we
can get a set of controller values that would give us a better actual step response than the one seen above for
– remember that one was quite different from expected, because it had a large
time constant associated with the Lag controller.
After some trial & error with the analytical formulae we come across quite an agreeable response – note that the
formulae can be easily programmed into Matlab so that the iterations are quite easy to perform. Let’s see the
results for – good results can be had for some other, smaller values as well. Again,
we need to find the gain and phase of the uncompensated system at that frequency – recall that reading it off
the graph is inaccurate so it is best to substitute into G(s):
Next, substitute these values into the formulae and first calculate our “lag” angle:
Note that at this point the “lift” angle has become a “lag” angle (negative value).
Both controller parameters are positive, so this controller will be acceptable. The open loop Bode plots before
and after compensation are shown in Figure 13‑25 and the system Phase Margin is shown in Figure 13‑26.
13.5 Lag Controller Design – Solved Example 1 | 352

![이미지](images/page359_img00.webp)

Figure 13‑25: Open Loop Frequency Responses in Lag Design Example – Analytical Design
The controller transfer function is:
Note that with a much smaller value of , this design may be actually better than the one with a higher
crossover frequency, as the closed loop compensated response will be closer to the expected model – no
slow exponential visible. Let’s check this theory out. The expected compensated closed loop response can be
estimated using the dominant poles model again. Use the formula below, or read off the Phase Margin graph
in Figure 12‑9:
353 | 13.5 Lag Controller Design – Solved Example 1

![이미지](images/page360_img00.webp)

Figure 13‑26: Compensated Phase Margin in Lag Design Example – Analytical Design
The compensated closed loop model:
Model specs can be calculated as:
The actual closed loop transfer function:
13.5 Lag Controller Design – Solved Example 1 | 354
Note that the closed loop model based on the dominant poles is now more accurate than in the case of the
“simplified” design – while the additional pole-zero combo still shows up, both very close to the Imaginary axis,
their net effect on the closed loop response is almost negligible because of a much better “near-cancellation”:
we have a zero at -0.068, and a pole at -0.063. Before they were at -0.017 and -0.0146, respectively. The very large
time constant associated with the Lag Controller is no longer visible in the step response, and the Settling Time
is much as expected – see the actual step response comparison and the comparison of the specs below.
Below, we compare the expected specs, based on the model, with the actual system response specs, obtained
by running the “stepeval” function. The actual specs, compared to the model specs, are:
– Model for the
Actual Compensated System
Compensated System
PO 10.6% 8.8%
3.125% 3.125%
19.7 sec 20.1 sec
41.1 sec 42.1 sec
The estimates are very accurate. Finally, let’s see how much of an improvement we achieved by introducing the
Lag Controller – see the comparison of the responses in Figure 13‑28.
Plus of the Analytical Lag Design – it can be quickly iterated to find a much better system
performance, often without the long and visible slow time constant associated with the Simplified
Lag Design.
Minus of the Analytical Lag Design – sometimes the design formulae will yield negative, i.e.
unacceptable, values of controller parameters. This can be addressed by a slightly different choice of
the crossover frequency and the phase margin.
355 | 13.5 Lag Controller Design – Solved Example 1

![이미지](images/page362_img00.webp)

Figure 13‑27: Compensated Closed Loop Step Response in Lag Design Example – Analytical Design
13.5 Lag Controller Design – Solved Example 1 | 356

![이미지](images/page363_img00.webp)

Figure 13‑28: Comparison of Closed Loop Step Responses in Lag Design Example
357 | 13.5 Lag Controller Design – Solved Example 1
13.6 Lead - Lag Controller
Lead-Lag Control combines benefits of both the Lead and the Lag Controllers. The transfer function of the Lead-
Lag Controller is as follows:
Equation 13-27
Kc corresponds to the DC gain of the controller, and both , . There are two zeros, at
, and , and two poles, at and . Note that what makes this compensator
“tick”, is its sequence: POLE-ZERO-ZERO-POLE, as shown in Figure 13‑29. In the frequency domain, the four
corner frequencies are:
, , ,
A frequency response plot of the lead-lag compensator is shown in Figure 13‑30. Again, note the sequence:
POLE-ZERO-ZERO-POLE, as shown in Figure 13‑29. This structure is sometimes also referred to as the Lag-Lead
Controller – the Lag block comes first on the frequency plot, followed by the Lead block as Figure 13‑30 shows.
We will however use the name Lead-Lag Controller, based on the sequence in which its components are used
in the design – the Lead component is used first, then the Lag component.

![이미지](images/page364_img00.webp)

Figure 13‑29: Pole Zero Map for Lead-Lag Controller
13.6 Lead - Lag Controller | 358

![이미지](images/page365_img00.webp)

Figure 13‑30: Frequency Response Plots for Lead-Lag Controller
13.6.1 Simplified Lead – Lag Controller Design
Figure 13‑31 shows the values significant for the design procedure which is as follows: choose the compensator
gain , based on the steady state error requirements for the closed loop operation. Re-plot the open loop
frequency response, including the required “gain lift”:
Equation 13-28
Assume the necessary phase margin , based on the required Percent Overshoot. Determine the crossover
frequency , from the settling time requirement.
Determine the necessary phase lead lift at this frequency (add an extra 5 degrees, since the Lag Controller
block will be used):
Equation 13-29
359 | 13.6 Lead - Lag Controller

![이미지](images/page366_img00.webp)

Figure 13‑31: How to Use Lead-Lag Compensator in Simplified Design
Calculate the Lead parameter :
Equation 13-30
Calculate the Lead time constant from:
Equation 13-31
Calculate (or measure from the plot) the total open loop gain at the crossover frequency:
Equation 13-32
Calculate the Lag parameter from a necessary gain reduction at this frequency:
Equation 13-33
Calculate the Lag time constant from:
13.6 Lead - Lag Controller | 360
Equation 13-34
Comment:
This design theoretically meets all three typical performance requirements – accuracy, speed, and lack of
oscillations. Whether it will work well, depends on how closely the compensated closed loop transfer function
resembles our standard second order under-damped model, on which the design was based. Always run
simulations of the closed loop system response under this compensation scheme – the design may require
iterations to improve its performance.
361 | 13.6 Lead - Lag Controller
13.7 Examples
13.7.1 Example
Consider a following closed loop system where a Lead Controller is to be designed such that the system will
have less than 10 % overshoot and a Settling Time of 2 seconds. Note that the uncompensated system is
unstable!!

![이미지](images/page368_img00.webp)

![이미지](images/page368_img01.webp)

13.7 Examples | 362
13.7.2 Example
Consider a following closed loop system:

![이미지](images/page369_img00.webp)

Part 1: Evaluate the system closed loop step response based on the provided open loop frequency response.
Part 2: Design a Lead Controller such that the Percent Overshoot is less than 20 %, Settling Time is less than 4
seconds and the steady state ramp error no larger than that for the uncompensated system.

![이미지](images/page369_img01.webp)

363 | 13.7 Examples
13.7.3 Example
Consider again the control system in Example 13.7.3 above. Design a Lag Compensator for this system such
that the percent overshoot is less than 20 % and the steady state ramp error is no larger than that for the
uncompensated system.
13.7.4 Example
Consider again the same system Example 13.7.3 above, but with a different controller, this time it will be the
Lead-Lag Controller. Design it for this system so that the Percent Overshoot is less than 20 %, settling time is
less than 4 seconds and the steady state ramp error no larger than that for the uncompensated system.
13.7.5 Example
Consider a unit feedback system under dynamic control as shown. A Lead Controller will be implemented for
this system. The open loop frequency response plot is provided.

![이미지](images/page370_img00.webp)

13.7 Examples | 364

![이미지](images/page371_img00.webp)

Part 1. Specify conditions for the controller parameters , , so that it is a Lead Controller (as opposed to
Lag Controller).
Part 2. Find the required controller DC gain so that the closed loop steady state error to a ramp input is 0.2
V/V.
Part 3. Adjust the magnitude scale on the Bode plot so that the plot reflects the frequency response for
, with the value of the DC gain of the controller as found in item # 1. Determine the
approximate phase crossover frequency and the phase margin of the adjusted system. Note that at this point
the system is only under Proportional Control, as calculated in item # 1.
Part 4. The system is to be compensated with a Lead Controller. The requirements are: ramp error of no more
than 0.2 V/V; closed loop system has a damping ratio of at least 0.3; Settling Time is to be less than 10 seconds.
Design the Lead Controller to achieve the specifications outlined above. Show all the steps used to arrive at your
answer.
13.7.6 Example
A unit feedback control system is shown, where the actuator/process transfer function is as shown below, K is
365 | 13.7 Examples
a controller DC gain, and the LAG Controller structure is used. Frequency response plots of the process transfer
function G(s) are shown as well.

![이미지](images/page372_img00.webp)

,
Part 1. Select a controller gain K and design a phase-lag compensator such that the following
requirements are met: a) the steady state error to a unit ramp input for the compensated closed loop system is
less than 0.02, and b) the phase margin of the system is at least 45 degrees.
Write the controller transfer function, clearly specify all controller parameters ( ), and superimpose the
resulting compensated system plots on top of the plots. (Re-scale the axes if necessary.)
Part 2. Estimate the following specifications of the compensated closed loop unit step response: the percent
overshoot; the settling time (provide your definition of the settling time); the steady state error to a unit ramp.
Clearly show how you arrived at your estimates.
13.7 Examples | 366

![이미지](images/page373_img00.webp)

13.7.7 Example
Consider a unit feedback control system. Frequency response plots of the process transfer function G(s) are as
shown.
Part 1. Define the Second Order Model that would conform to these specifications. Read off the plot the current,
uncompensated open loop frequency response parameters that affect the uncompensated closed loop step
response: Position Constant, , Phase Margin, , and Crossover Frequency for Phase Margin, .
Part 2. Next, “translate” the requirements for the compensated closed loop step response into the desired
compensated open loop frequency response parameters.
Part 3. Design a Lead Controller for this system. The compensated closed loop system is to have the following
specifications for its unit step response: Percent Overshoot equal to 10%; Settling time (within of the
steady state value) equal to 1 second, and Steady state error (in %) equal to 1%.
Note that you do not need to know the transfer function of the system to design the required controller.
367 | 13.7 Examples

![이미지](images/page374_img00.webp)

13.7.8 Example
Consider a unit feedback system under dynamic control, as shown below. Open loop Bode plot for the process
is also included.

![이미지](images/page374_img01.webp)

13.7 Examples | 368

![이미지](images/page375_img00.webp)

Part 1. A Lag Controller is to be implemented. Show what condition is to be met for the coefficients in the
generic transfer function of the controller in order for it to correspond to the LAG configuration (as
opposed to the LEAD configuration):
Part 2. The system is to be compensated with a Lag Controller. The requirements are: step error of no more
than 2%; closed loop system has a damping ratio of at least 0.45 – assume the Phase Margin ; Phase
crossover frequency is equal to rad/sec. Design the Lag Controller to achieve the specifications
outlined above. Show all the steps used to arrive at your answer. Estimate selected step response specifications
of the compensated closed loop system. As a first step, adjust the magnitude scale so that the plot reflects the
frequency response for , with the value of the DC gain of the controller as previously
found. Determine the approximate phase crossover frequency and the phase margin of the adjusted system.
13.7.9 Example
An appropriate controller has to be designed for a unit feedback control system shown. The frequency response
plots of the uncompensated open loop transfer function is included.
369 | 13.7 Examples

![이미지](images/page376_img00.webp)

The compensated closed loop system response requirements are that the Percent Overshoot of the normalized
unit step response be no more than 20%, and that the steady state error in percent be no more than 5%. Try
both the Lead and the Lag Controller design to meet the requirements.

![이미지](images/page376_img01.webp)

13.7.10 Example
Consider a certain unit feedback closed loop system under proportional Control where the process is described
by the following transfer function G(s), with the frequency response plots as shown.
13.7 Examples | 370

![이미지](images/page377_img00.webp)

Part 1. Estimate the following specifications of the uncompensated closed loop unit step response: Percent
Overshoot PO, the settling time and the steady state error .
Part 2. The system is to be compensated by the Lag Controller with a transfer function as described:
,
or
,
Design the Controller such that the following requirements are met: Steady State Error for the
compensated closed loop system is less than 2%; Phase Margin for the compensated system is equal to
;
Phase margin crossover frequency is equal to 1 rad/sec. Clearly specify controller parameters in either of the
forms shown and superimpose the compensated system plots on top of the provided uncompensated system
Bode plots to illustrate your design.
371 | 13.7 Examples
Part 3. Estimate the following specifications of the compensated closed loop unit step response: Percent
Overshoot PO, the settling time and the steady state error .
13.7.11 Example
A unity feedback control system is to operate under Lead Control, where the controller transfer function is:
,
Frequency response plots of the uncompensated open loop transfer function are shown.

![이미지](images/page378_img00.webp)

Part 1. Estimate the following specifications of the uncompensated closed loop unit step response: the Percent
Overshoot PO, the Settling Time and the steady state error , as well as the steady state
error to a unit ramp . Clearly show how you arrived at your estimates.
Part 2. Design a phase Lead Compensator such that the following requirements are met: the steady
state error to a unit ramp input for the compensated closed loop system is less than or equal to 0.3(
the percent overshoot is less than or equal to 15% ; the settling time is less
than 3 sec . Write the controller transfer function, clearly specify all controller parameters
and superimpose the resulting compensated system plots on top of the plots shown.
13.7 Examples | 372
13.7.12 Example
A unit feedback control system is to operate under Lead Control, where the process transfer function is:
Frequency response plots for the uncompensated open loop system are shown next. Design requirements are:
the Steady State Error for the unit step input for the compensated closed loop system is to be no more than
2%; Percent Overshoot of the compensated closed loop system is to be no more than 15%; the Settling Time,
, is to be no more than 5 seconds.
PART A: Calculate the Position Constant for the uncompensated system , then the Position
Constant for the compensated system that would meet the design requirements. Read off the
Phase Margin of the uncompensated system and then decide what value of the Phase Margin for
the compensated system would meet the design requirements. Read off the Phase Margin crossover
frequency of the uncompensated system and then decide what value of the crossover frequency
for the compensated system would meet the design requirements. Calculate the appropriate Lead
Controller parameters and the Controller transfer function. Show the general shape of the compensated
frequency response by overlaying it on top of the uncompensated plot.
PART B: A Lead Controller was designed so that the compensated closed loop system met all the requirements.
The closed loop transfer function of the closed loop system was derived as follows:
Show that the steady state error, , is indeed equal to 2%. Estimate the closed loop step response
specs and . The actual values were: seconds, and .
Explain any possible discrepancies between these values and the above estimates.
373 | 13.7 Examples

![이미지](images/page380_img00.webp)

13.7.13 Example Lead Design – Winter 2017 Final Exam
Consider a unit feedback closed loop control system. The system is to operate under Lead Control. The process
transfer function G(s) is as follows:
Open loop frequency response plots of G(s) are as shown. Design requirements are: Steady State Error for the
unit step input for the compensated closed loop system is to be no more than 4%. Percent Overshoot of the
compensated closed loop system is to be no more than 20%. The Settling Time, , is to be no more
than 0.5 seconds.
PART 1: Calculate the Position Constant for the uncompensated system , then the Position Constant
for the compensated system that would meet the design requirements.
PART 2: Read off the Phase Margin of the uncompensated system and then decide what value of
the Phase Margin for the compensated system would meet the design requirements. Read off the
13.7 Examples | 374
crossover frequency of the uncompensated system and then decide what value of the crossover
frequency for the compensated system would meet the design requirements.
PART 3: Calculate the appropriate Lag Controller parameters and clearly write the Lag Controller transfer
function .
PART 4: Estimate the compensated closed loop step response specs: PO, , and
.

![이미지](images/page381_img00.webp)

13.7.14 Example Lag Design – Winter 2018 Final Exam
Consider a unit feedback closed loop control system. The system is to operate under Lag Control. The process
transfer function G(s) is as follows:
Open loop frequency response plots of G(s) are as shown. Design requirements are: Steady State Error for the
375 | 13.7 Examples
unit step input for the compensated closed loop system is to be one fifth of the Steady State Error for the
uncompensated system. Percent Overshoot of the compensated closed loop system is to be no more than 15%.
PART 1: Calculate the Position Constant for the uncompensated system , then the Position Constant
for the compensated system that would meet the design requirements.
PART 2: Read off the Phase Margin of the uncompensated system and then decide what value of
the Phase Margin for the compensated system would meet the design requirements. Read off the
crossover frequency of the uncompensated system and then decide what value of the crossover
frequency for the compensated system would meet the design requirements.
PART 3: Calculate the appropriate Lag Controller parameters and clearly write the Lag Controller transfer
function .
PART 4: Estimate the compensated closed loop step response specs: PO, , and
.

![이미지](images/page382_img00.webp)

13.7 Examples | 376
CHAPTER 14
377 | Chapter 14
14.1 Why We Need Another Criterion of
Stability
There are several ways of looking at the system stability in:
• s-domain
◦ Routh-Hurwitz Criterion
◦ Root Locus (still to come)
• frequency domain
◦ Gain and Phase Margins
These approaches all have their limitations. The usefulness of s-domain based Routh-Hurwitz Criterion and the
Root Locus method is limited by the fact that the system description has to be known accurately (i.e. exact
system identification, no approximate models) in order to be able to establish the relative system stability. And,
when the system description is known but the system order is high, hand-calculations based on Routh Array
become very tedious. A computer-based approach is necessary, as in plotting the Root Locus using MATLAB,
and then determining the critical gain and critical frequency of oscillations from the plot.
A simple alternative is to use open loop frequency response plots, which can be measured directly from the
system, or sketched using linear approximations. Definitions of Gain Margin and Phase Margin do
not require that the system transfer function be known, and this is their major advantage. As well, the
procedure of determining of Gain Margin and Phase Margin does not increase in difficulty as the
system order increases.
However, the limitation of determining the system stability through Gain Margin and Phase Margin
is that it only applies to systems that are open-loop stable and minimum-phase. While the vast majority of
industrial control systems belong to this category, we need a more general stability criterion in frequency
domain that would cover such special cases.
Important Note: If the system is open-loop unstable, no measurements of frequency response are possible, of
course. However, the theoretical frequency response plot can be sketched, or computed, if the system transfer
function is known.
Note, that before Nyquist Criterion can be applied, we need to review a particular form of frequency response,
called Polar Plots.
14.1 Why We Need Another Criterion of Stability | 378
14.2 Polar Plots Revisited
Frequency response of a system is described by a complex frequency function, . Any complex function
can be represented in two different ways, using polar coordinates or rectangular coordinates. In general,
consider the function to be represented in polar coordinates:
Equation 14-1
In short-hand notation:
Equation 14-2
The two functions of frequency, magnitude function , and phase function , can be computed and
plotted, resulting in a familiar frequency response plot, also referred to as a Bode plot. The phase function
is usually plotted using degrees vs. radian/sec scale. The magnitude function , is usually plotted using
standard dB vs. radian/sec scale. However, for some purposes, it may be more convenient to plot using
Volt/Volt vs. radian/sec scale.
The advantage of using the magnitude-phase representation of the frequency response is that both functions
can be measured experimentally. This allows an empiric identification of the system transfer function
based on the measured magnitude and phase plots.
The same frequency response function can be represented in rectangular coordinates:
Equation 14-3
The two functions of frequency, and , can be computed and plotted, but they cannot be
measured experimentally. The relationship between , functions and , functions,
based on complex numbers algebra, is as follows:
379 | 14.2 Polar Plots Revisited
Equation 14-4
Inversely:
Equation 14-5
Note that in the above equations, the magnitude function is expressed in Volt/Volt units, not in decibels.
Functions , can be plotted in rectangular coordinates (using Volt/Volt units on both
axis) with frequency being a parameter along the curve, resulting in the Polar Plot.
Polar Plots cannot be directly obtained from an experiment, and have to be computed based on magnitude-
phase plots. Their application is mainly in determining the system stability in frequency domain (Gain and
Phase Margin concepts and Nyquist Stability Criterion).
14.2 Polar Plots Revisited | 380
14.3 Solved Examples for Polar Plots
14.3.1 Example
Consider the following transfer function:
Consider its frequency response, , at a specific frequency of rad/sec. Show its rectangular and
polar forms.
The polar form of this function is:
14.3.2 Example
Consider a simple first order system, with one real pole:
Now consider the rectangular representation of the same frequency response function :
The standard frequency response plot (Bode Plot) with magnitude in decibels and phase in degrees is shown
381 | 14.3 Solved Examples for Polar Plots
below. For the Polar Plot, crossovers with Imaginary and Real axis can be calculated analytically by setting first
the Real, then the Imaginary part to zero, and solving for frequency. In this example:

![이미지](images/page388_img00.webp)

14.3 Solved Examples for Polar Plots | 382

![이미지](images/page389_img00.webp)

This indicates that the polar plot starts at (1, j0) location for (DC condition), and ends at (0, j0) for
. The sense of increasing frequency should always be shown on the polar plot. The polar plot of the system
is shown.
To do plot polar plots in MATLAB, use subroutine nyquist – see below. The second plot (on the following
page) shows a so-called Nyquist contour, which will be discussed in detail later. The Nyquist contour consists
of the polar plot for positive frequencies, , and its mirror image for negative frequencies,
.
383 | 14.3 Solved Examples for Polar Plots

![이미지](images/page390_img00.webp)

![이미지](images/page390_img01.webp)

14.3 Solved Examples for Polar Plots | 384
14.3.3 Example
A process transfer function is described as follows: Frequency plots of are
shown. Sketch a polar plot for .
Solution: It is helpful to construct a table with the important coordinates:
Frequency Phase Magnitude
rad/s
rad/s
rad/s
rad/s
The resulting polar plot can be also plotted using MATLAB subroutine Nyquist.

![이미지](images/page391_img00.webp)

385 | 14.3 Solved Examples for Polar Plots

![이미지](images/page392_img00.webp)

14.3.4 Example
Consider a unity feedback control system under Proportional Control. The process transfer function is described
as follows:
Frequency plots of are shown. It is helpful to construct a table with the important coordinates read off
the plot. Note that this is Type I system, with an integrator, and therefore its polar plot will begin with an infinite
gain at the DC level.
Frequency Phase Magnitude in dB Magnitude in Volt/Volt
rad/s
rad/s dB Volt/Volt
rad/s
14.3 Solved Examples for Polar Plots | 386

![이미지](images/page393_img00.webp)

The resulting polar plot is shown.

![이미지](images/page393_img01.webp)

387 | 14.3 Solved Examples for Polar Plots
14.4 Gain and Phase Margins vs. Polar
Plots
14.4.1 Example Gain Margin from Polar Plot
Let the crossover frequency be defined as , the frequency at which the phase plot crosses over the
line. On the polar plot this corresponds to the plot crossing the negative part of Real axis. Remember the
definition of Gain Margin :
system stable
system unstable Equation 14-6
Equation 14-7
On the polar plot, Gain Margin can be found as an inverse of the coordinate A of the polar plot crossover
with the Real axis, as shown next. If the crossover is to the right of (-1, j0) point, , , and the
system is stable. If the crossover is to the left of (-1, j0) point, , , and the system is unstable.
14.4 Gain and Phase Margins vs. Polar Plots | 388

![이미지](images/page395_img00.webp)

14.4.2 Example Phase Margin from Polar Plot
The crossover frequency defined as , is the frequency at which the polar plot crosses over the unit circle (
dB = 1 Volt/Volt). Phase Margin is defined as Therefore, on the polar plot
Phase Margin can be found as the angle between the Real axis and the crossover of the polar plot with
the unit circle, as shown in Error! Reference source not found. If this angle is above the Real axis, the system is
unstable, if this angle is below the Real axis, the system is stable.
389 | 14.4 Gain and Phase Margins vs. Polar Plots

![이미지](images/page396_img00.webp)

14.4.3 Solved Example
Consider a unit feedback closed loop system where the open loop transfer function is known to be
unstable and its transfer function is known as Such system can be stabilized by using
an appropriately large value of the controller gain. We need to establish the critical gain .
Solution Part 1: Let’s tackle this problem in s-domain. The system closed loop characteristic equation is:
nd
For the 2 order system the necessary and sufficient condition of stability is that all coefficients of the
characteristic polynomial are positive:
14.4 Gain and Phase Margins vs. Polar Plots | 390
The critical value of the gain is and the range of gains for stable system performance is:
The frequency of oscillations at the critical gain is equal to rad/s:
The upper limit of the gain range will be determined by practical issues such as saturation.
Solution Part 2: Now let’s try to apply the Gain Margin and Phase Margin definitions to this system. The open
loop frequency response has to be simulated as the system is open-loop unstable and no measurements on
the open loop are possible. From the plot shown in Error! Reference source not found. we read:

![이미지](images/page397_img00.webp)

391 | 14.4 Gain and Phase Margins vs. Polar Plots
The positive Gain Margin Volt/Volt is measured at the crossover frequency = 2 rad/s. This
would have to be interpreted as the system being stable for gains lower than 2, which as we know from the s-
domain analysis, is not correct. On the other hand, the Phase Margin is negative, indicating the system
is unstable for gains . This is an example when the Gain and Phase Margin definitions cannot be applied
consistently to determine the system stability limits. A new, more general frequency domain based stability
criterion will now be defined.
14.4 Gain and Phase Margins vs. Polar Plots | 392
14.5 Concept of Mapping
Consider a map (function) :
The map (function) has singularities: a zero at , and two poles, at and .
Consider an arbitrary closed contour in the s-plane, traversed clockwise (CW), so that it does not go through
any singularities of . Let be a number of zeros of inside the -contour, and be a number of
poles of inside the -contour. Mapping the -contour into the plane will result in a closed
-contour. Let be a number of clockwise (CW) encirclements of the resulting -contour around the origin of
the -plane.
14.5.1 Case 1
Let the -contour be so chosen that Z = 0 and P = 0, i.e. there are no singularities of inside the – contour.
Note that the resulting -contour in the -plane does not encircle the origin of -plane, i.e. N = 0.

![이미지](images/page399_img00.webp)

14.5.2 Case 2
Next, let the -contour be so chosen that and P = , i.e. there is one zero of inside the -contour.
393 | 14.5 Concept of Mapping
Note that the resulting -contour in the -plane encircles the origin of -plane once in a clockwise
(CW) direction, i.e. N = .

![이미지](images/page400_img00.webp)

14.5.3 Case 3
Next, let the -contour be so chosen that and , i.e. there is one pole of inside the
-contour. Note that the resulting -contour in the -plane encircles the origin of -plane once in a
counter-clockwise (CCW) direction, i.e. .
14.5 Concept of Mapping | 394

![이미지](images/page401_img00.webp)

14.5.4 Case 4
Next, let the -contour be so chosen that and , i.e. there is one zero and one pole of inside
the -contour. Note that the resulting -contour in the -plane does not encircle the origin of
-plane, i.e.

![이미지](images/page401_img01.webp)

395 | 14.5 Concept of Mapping
14.5.5 Case 5
Next, let the -contour be so chosen that and , i.e. there are two poles of inside the
-contour. Note that the resulting -contour in the -plane encircles the origin of -plane twice in a
counter-clockwise (CCW) direction, i.e.

![이미지](images/page402_img00.webp)

14.5.6 Case 6
Next, let the -contour be so chosen that and , i.e. there is zero and poles of inside the
-contour. The area of the origin may not be very visible, so see a zoomed version in Error! Reference source
not found. Note that the resulting -contour in the -plane encircles the origin of -plane once in a
counter-clockwise (CCW) direction, i.e. .
14.5 Concept of Mapping | 396

![이미지](images/page403_img00.webp)

![이미지](images/page403_img01.webp)

397 | 14.5 Concept of Mapping
14.6 Cauchy's Mapping Theorem
Let’s summarize the above cases. Consider an arbitrary closed contour in the s-plane, traversed clockwise
(CW), so that it does not go through any singularities of . Let be a number of zeros of inside the
-contour, and be a number of poles of inside the -contour. Mapping the -contour into the
plane will result in a closed -contour. Let be a number of clockwise (CW) encirclements of the resulting
-contour around the origin of the -plane. The total number of encirclements of the origin of -plane
through the above mapping is equal to:
Equation 14-8
14.6.1 How Does Cauchy’ Mapping Theorem Apply to a Control System Stability?
Consider a closed loop system:

![이미지](images/page404_img00.webp)

The characteristic equation is:
Define a map (function) such that it is described by a characteristic equation of the closed loop:
Equation 14-9
Note that roots of the numerator of the map are equivalent to closed loop poles and that the roots of the
14.6 Cauchy's Mapping Theorem | 398
denominator of the map are equivalent to open loop poles. Now consider taking a -contour such that it
encompasses all of the RHP, as shown:

![이미지](images/page405_img00.webp)

Typically, the open loop poles locations are known, i.e. P is a known number of unstable open loop poles – we
can count how many open loop poles are within this contour. The closed loop poles locations are unknown, i.e.
Z is what we want to find out. However, from Cauchy’s Theorem:
The question then is, how to find N? If we can perform the mapping into -plane, N can be simply counted.
While the mapping into (closed loop characteristic equation) is not simple, mapping into is
very simple – we will use a polar plot to do that. Note that:

![이미지](images/page405_img01.webp)

399 | 14.6 Cauchy's Mapping Theorem
Map can then be obtained from the map by a linear translation by . Map
is easily obtained through frequency response. So, rather than watching the number N of CW encirclements
of the origin of plane, we will be watching the number N of CW encirclements of the (-1,j0) point in the
-plane.
Remember that Z represents the total number of zeros of the map inside the chosen -contour in the
s-plane, i.e. in the RHP (unstable region). Since the map was defined for the closed loop characteristic
equation, its zeros represent closed loop poles of the control system. Z then represents the total number of
unstable closed loop poles of the system.
Since , for the system to be stable, Z must be equal to zero, i.e. N + P = 0, or N = -P.

![이미지](images/page406_img00.webp)

We can then define the following stability criterion:
Take a closed -contour in the s-plane in a CW direction so that it encompasses all of RHP. Obtain the Nyquist
contour in the plane through mapping (utilize frequency response – polar plots – to do so).
For stability, the Nyquist contour for the closed loop control system with P unstable open loop poles must
encircle the (-1,j0) point in -plane P times in CCW direction.
Typically, we are not interested in the absolute system stability (i.e. is the system stable or not?), but in the
relative system stability (i.e. what is the range of gains for which this system is stable?):
14.6 Cauchy's Mapping Theorem | 400

![이미지](images/page407_img00.webp)

401 | 14.6 Cauchy's Mapping Theorem
14.7 Solved Examples of Nyquist Stability
Criterion
14.7.1 Example
A unity feedback control system is to work under Proportional Control. The process transfer function is
described as follows:
Apply the Nyquist criterion to determine the system closed loop stability. Step 1: determine number of unstable
open loop poles:

![이미지](images/page408_img00.webp)

There are no unstable poles, .
Step 2: choose appropriate contour in the s-plane. The -contour can be divided into several segments:
14.7 Solved Examples of Nyquist Stability Criterion | 402

![이미지](images/page409_img00.webp)

Segment 1 corresponds to the positive Imaginary axis, i.e. . It maps into -plane as a polar
plot . The polar plot can be obtained analytically (tedious), plotted based on
Bode plot information (magnitude and phase – just remember that magnitude has to be expressed in Volt/Volt
unit, not in dB), or computed using MATLAB.
Segment 3 corresponds to the negative Imaginary axis, i.e. and its map, , is a
mirror image of the polar plot . Segment 2 corresponds to:
Where changes from to . Segment 2 typically maps into the origin of the map –
(0,j0) point, since most systems have more poles than zeros:
Step 3: Map the s-plane contour into the plane.
Segment 1 maps into a polar plot, as obtained in the previous example. Segment 2 maps into the origin, and
Segment 3 maps into a mirror image of the polar plot, as shown.
403 | 14.7 Solved Examples of Nyquist Stability Criterion

![이미지](images/page410_img00.webp)

The size of the contour will vary depending on the gain . In Error! Reference source not found., contours are
shown for three different values of , , , and .

![이미지](images/page410_img01.webp)

It is easier however to retain the same contour and scale the Real and Imaginary axis in the
-plane.
14.7 Solved Examples of Nyquist Stability Criterion | 404

![이미지](images/page411_img00.webp)

Step 4
Apply the Nyquist Criterion. When the plot is scaled for Proportional Gain , four different areas can be
analyzed:
Z = N+P = 0 + 0 = 0 stable
Z = N+P = 2+0 = 2 unstable
Z = N+P = 1+ 0 = 1 unstable
Z = N+P = 0 + 0 = 0 stable
Based on the Nyquist Stability Criterion, two ranges of values for stable system operation have been found
(only one practical, for ):

![이미지](images/page411_img01.webp)

14.7.2 Example
Consider the same system as before, where a unity feedback control system is to work under Proportional
Control, with the process transfer function described as follows:
405 | 14.7 Solved Examples of Nyquist Stability Criterion
Apply the Nyquist criterion to determine the system closed loop stability.
Solution
Step 1: determine number of unstable open loop poles, :

![이미지](images/page412_img00.webp)

Step 2: choose appropriate contour in the s-plane..

![이미지](images/page412_img01.webp)

Step 3: Map the contour into the plane. Use the information provided in the open loop frequency
plots. Segment 1 maps into the system polar plot, as obtained in the Example 14.3.3. Segment 2 maps into the
origin, and Segment 3 maps into a mirror image of the polar plot.
14.7 Solved Examples of Nyquist Stability Criterion | 406

![이미지](images/page413_img01.webp)

Step 4 Apply the Nyquist Criterion. When the plot is scaled for Proportional Gain , four different areas can be
analyzed:
Z = N+P = 0 + 0 = 0 stable
Z = N+P = 2+0 = 2 unstable
Z = N+P = 1 + 0 = 1 unstable
Z = N+P = 0 + 0 = 0 stable
Based on the Nyquist Stability Criterion, the system is stable for:

![이미지](images/page413_img00.webp)

14.7.3 Example
Consider the system from Example 14.3.4, of a unity feedback control system under Proportional Control, with
the process transfer function described as follows:
407 | 14.7 Solved Examples of Nyquist Stability Criterion
Apply Nyquist stability criterion to this system.
Solution:
The polar plot of this system was established in Example 14.3.4. Note that because it is a Type I system, its open
loop pole sits at the origin of the s-plane. Choose the -contour encircling the whole of the unstable region,
RHP, avoiding going through the origin of the s-plane – one of the system singularities (integrator) is there. We
can encircle the origin with a radius of zero on either left or right side. The contour below encircles the origin
on the right, as shown. There are no unstable open loop poles of in this contour, P = 0. Note that if we
chose to encircle the origin of the s-plane to the left, we would end up with 1 unstable open loop pole inside the
contour. There are four segments of the -contour to be mapped.

![이미지](images/page414_img00.webp)

Segment 1 corresponds to the positive Imaginary axis, i.e. . It maps into -plane as a polar
plot .
Segment 3 corresponds to the negative Imaginary axis, i.e. and its map, , is a
mirror image of the polar plot . Segment 2 corresponds to:
Where changes from to . Segment 2 maps into the origin of the map – (0,j0) point,
since the system has three poles.
Segment 4 corresponds to the minuscule encirclement to the right of the origin: , , where
changes from to . Since magnitude of approaches zero, the shape of the resulting contour
will have an infinite radius. We need to figure out which way it circles in the plane:
14.7 Solved Examples of Nyquist Stability Criterion | 408
This table tells us that as we follow the Segment 4 of the -contour, it maps into a -plane contour, which
is a clock-wise (CW) half-circle with an infinite radius. The complete Nyquist contour for this system is shown
next.

![이미지](images/page415_img00.webp)

There are three areas for analysis of the relative position of the Nyquist contour and the (-1/K,j0) point:
Z = N+P = 0 + 0 = 0 stable
Z = N+P = 2+0 = 2 unstable
Z = N+P = 1+ 0 = 1 unstable
Based on the Nyquist Stability Criterion, the system is stable for
14.7.4 Example
Consider the system with the unit feedback closed loop system under Proportional Gain as before, where the
open loop transfer function is known to be unstable and its transfer function is known as
409 | 14.7 Solved Examples of Nyquist Stability Criterion
Apply the Nyquist Criterion of Stability to this system.
Solution
Choose the -contour encircling the whole of the unstable region, RHP, avoiding going through the origin of
the s-plane – one of the system singularities (integrator) is there. We can encircle the origin with a radius of zero
on either the left or right side. The contour below encircles the origin on the right.

![이미지](images/page416_img00.webp)

There is one unstable open loop pole of in this contour (pole at +2,j0), i.e. P = 1. Note that if we chose to
use the contour encircling the origin to the left, two unstable open loop poles would be included inside the
-contour. There are four segments of the -contour to be mapped. Segment 1 corresponds to the positive
Imaginary axis, i.e. . It maps into -plane as a polar plot . The polar plot can
be obtained analytically (tedious), plotted based on Bode plot information (magnitude and phase – just
remember that magnitude has to be expressed in Volt/Volt unit, not in dB), or computed using
MATLAB. Let’s try the analytical approach for a change.
14.7 Solved Examples of Nyquist Stability Criterion | 410

![이미지](images/page417_img00.webp)

In frequency domain can be expressed as
Based on the above equations, the polar plot starts at for frequency , crosses over the Real
axis at rad/s at the coordinate (-0.5,j0), and ends in the origin (0,j0) at . We can arrive at the
same conclusion simply checking the open loop frequency plots, shown again below.
To sketch the polar plot using Bode plot information, write appropriate values of important frequencies and
corresponding magnitudes and phases in a table like the one below:
frequency Magnitude in dB Magnitude V/V Phase in degrees
rad/s dB Volt/Volt
411 | 14.7 Solved Examples of Nyquist Stability Criterion

![이미지](images/page418_img00.webp)

The polar plot corresponding to Segment 1 of the s-plane contour can then be sketched. Segment 2
corresponds to
where changes from to . Segment 2 maps into the origin of the map – (0,j0) point,
since the system has two poles and only one zero. Segment 3 corresponds to the negative Imaginary axis, i.e.
and its map, , is a mirror image of the polar plot . Segment 4
corresponds to the minuscule encirclement to the right of the origin:
where ; changes from to . Since magnitude of s approaches zero, the shape of the resulting
contour will have an infinite radius.

![이미지](images/page418_img01.webp)

We need to figure out which way it circles in the plane:
14.7 Solved Examples of Nyquist Stability Criterion | 412
This table tells us that as we follow the Segment 4 of the -contour, it maps into a -plane contour, which
is a counter-clock-wise (CCW) half-circle with an infinite radius. The complete Nyquist contour for this system
is shown next. There are three areas for analysis of the relative position of the Nyquist contour and the (-1/K,j0)
point:
Z = N+P = 1 + 1 = 2 unstable
Z = N+P = -1+1 = 0 stable
Z = N+P = 0+ 1 = 1 unstable
Based on the Nyquist criterion, the system is stable for .

![이미지](images/page419_img00.webp)

413 | 14.7 Solved Examples of Nyquist Stability Criterion
This is where you can add appendices or other back matter.
Appendix | 414
