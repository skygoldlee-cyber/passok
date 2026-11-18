# 연소공학 강의노트(KOCW)
> 출처: KOCW · 차시별 강의노트 PDF 결합물


# 과목1_연소공학_전남대 차시21 (1103283)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/1.pdf · 강의노트 PDF → md 변환물

1
1
Chapter 1
Introduction
Chonnam Nat. Univ.
School of Mechanical System Engineering
Prof. Byung-Chul Choi
2
Chapter 1 Introduction
Motivation
불의기원(盜火神話)
from “그리스로마신화”, 가나출판사


2
3
Korea Energy Consumption
석탄
24%
석유
49%
LNG
11%
수력
1%
원자력
14%
기타
1%
1차 에너지원별 소비실적 (Korea), 2002
4
Korea Energy Consumption
0
5
10
15
20
25
30
35
40
45
50
석유류
석탄류
원자력
LNG
수력
신탄
2002
2003
2004
2005
2006
%


3
5
Korea Energy Consumption
2003
2004
2005
Factory Production 
(mil. $)
Rate
(%)
Factory Productio
n (mil. $)
Rate
(%)
Factory Production 
(mil. $)
Rate
(%)
Gasoline
5
3,546.7
21.05 
5
4,523.2
20.14 
5
6,215.1
19.51 
Kerosene
6
3,492.7
20.73 
6
3,370.9
15.01 
6
3,807.3
11.95 
Diesel
5
7,976.8
47.34 
5
12,108.2
53.91 
5
19,252.2
60.43 
LPG
9
1,448.2
8.59 
8
1,933.1
8.61 
6
2,014.8
6.32 
Alcohol
26
283.7
1.68 
26
398.4
1.77 
23
355.2
1.12 
Methanol
6
13.2
0.08 
5
18.5
0.08 
6
8.2
0.03 
Ethanol
(Industry)
9
45.1
0.27 
9
49.7
0.22 
7
56.2
0.18 
Other 
alcohol
11
225.4
1.34 
12
330.1
1.47 
10
290.8
0.91 
Hydrogen
18
103.4
0.61 
15
124.9
0.56 
25
211.9
0.67 
Total
16,851.6
100
22,458.9
100
31,856.5
100
6
Crude oil and corn prices
원인?
1. 석유가인상→대체에너지(연료) 개발
2. 대체연료의원료→곡물


4
7
USA Energy Sources and Consumption
Fossil
Fuel
86%
8
USA Electricity Generation


5
9
USA Energy Consumption estimates
Coal
22%
Natural gas
24%
Petroleum
38%
Other
4%
Hydroelectric P
4%
Nucl
8%
1996
10
Korea Energy Consumption
석탄
13%
석유
60%
도시가스
9%
전력
15%
열
1%
기타
2%
최종 에너지원별 소비구조 (Korea), 2002년
100%-전력15%-열기타3% =82% 연소에의한에너지이용


6
11
Korea Energy Consumption(2011)
12
Korea Energy Consumption(2011)


7
13
Particulate Matter trends for the USA
Clean Air Act Amendments
14
SOx trends for the USA
Clean Air Act Amendments


8
15
NOx trends for the USA
Clean Air Act Amendments
16
VOC trends for the USA
Clean Air Act Amendments


9
17
CO trends for the USA
Clean Air Act Amendments
18
A Definition of Combustion
“ rapid oxidation generating heat or both
light and heat : also, slow oxidation
accompanied by relatively little heat and
no light”


10
19
Combustion Modes and Flame Types
Flame –Premixed flame : gasoline engine
–Diffusion flame : diesel engine
Non-flame : Solid combustion,
Catalytic combustion
20
FIN


# 과목1_연소공학_전남대 차시21 (1103284)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/2.pdf · 강의노트 PDF → md 변환물

B.C.Choi
1
Chapter 2 
Combustion and Thermochemistry
뷔르거작허풍선이남작의모험
B.C.Choi
2
Property Relations
1. Extensive and Intensive property
-
Extensive property : V(m3), U(J), H(J)=U+PV
-
Intensive property : v(m3/kg), u(J/kg), h(J/kg)
v-(m3/kmol), u-(J/kmol), h-(J/kmol)
2. Equation of State
PV = N Ru T   
Ru:universal gas constant (=8315J/kmol-K)
PV = m R T
Pv = RT


B.C.Choi
3
3. Calorific Equations of State
u = u(T, v)
h = h(T,P)
du = (∂u/∂T)v dT + (∂u/∂v)T dv
dh = (∂h/∂T)P dT + (∂h/∂p)T dP
where, 
constant-volume specific heat : cv = (∂u/∂T)v
constant-pressure specific heat : cp = (∂h/∂T)P
For ideal gas, (∂u/∂v)T dv=0, (∂h/∂p)T dP=0
Integration, Tref Æ T
u(T) – uref = ∫cv dT
h(T) – href = ∫cp dT
B.C.Choi
4
For both real and ideal gas, 
cv or cp = f(T) 
Molar const.-pressure specific heats


B.C.Choi
5
4. Ideal-gas Mixtures
mole fraction of species i, Xi
Xi = Ni/(N1 +N2 + N3 + …. + Ni +…) = Ni/Ntot
similarly, the mass fraction of species i, Yi
Yi = mi/(m1 +m2 + m3 +….+ mi +…)=mi/mtot
=Xi MWi / MWmix
ΣXi = 1, ΣYi = 1
Mixture molecular weight,
MWmix= ΣXi MWi
= 1/{ΣYi/ MWi}
Partial pressure of the ith species, Pi
P = ΣPi , Pi= Xi P 
B.C.Choi
6
0
u
0
P
P
ln
R
)
P
(T,
S
P)
(T,
S
−
=
o
KJ/(Kmol·K)
For ith species of Ideal-gas mixture,
0
m
i
u
0
i
i
i
P
P
y
ln
R
)
P
(T,
S
)
P
(T,
S
−
=
o
KJ/(Kmol·K)
m
i
i
P
y
P =
Q
Pi : partial pressure of the ith species 
yi : mole fraction of the ith species 
Pm : mixture total pressure
0P
P
Rln
S 
−
=
∆
S(T,P)
P
P0=1 atm
)
P
(T,
S
0
o
S
T
T
이상기체-표준상태
- 이상기체혼합물에서
한성분의엔트로피계산시
그성분의분압이용
등온


B.C.Choi
7
5. Latent heat of vaporization
hfg = at a given temp., in a constant-pressure, 
the heat required to completely vaporize 
a unit mass of liquid 
hfg (T,P) = hvapor(T,P) –hliquid(T,P)
Latent heat of vaporization
= Enthalpy of vaporization
*Heating Value(HV) :
(1) Lower HV, LHV
Water appears as a gas in the products.
(2) Higher HV, HHV
Water appears as a liquid in the products.
HHV = HLV + (NH2O ho
f H2O)       kJ/kg fuel
B.C.Choi
8
1st Law Analysis of Reacting Systems
1. 화학Energy 변화의표현
①Steady-flow Systems
(KJ/Kmol)
표준상태에서enthalpy of formation
주어진상태에서Sensible enthalpy
표준상태sensible enthalpy
Ke, Pe 무시
에너지보존법칙은
(KJ/S)
: the molal flow of the product
: the molal flow of the reactant
)
h
h
(
h
Enthalpy
f
o
o
−
+
=
•
p
n
•
rn
o
fh
o
h
h
r
f
r
p
f
p
)
h
h
h
(
n
)
h
h
h
(
n
W
Q
o
o
o
o
−
+
−
−
+
=
−
∑
∑
•
•
•
•
(KJ/S)
Enthalpy at 
25C, 1atm
Sensible enthalpy 
reactive 
at 25C,1atm


B.C.Choi
9
r
f
r
p
f
p
)
h
h
h
(
N
)
h
h
h
(
N
W
Q
o
o
o
o
−
+
−
−
+
=
−
∑
∑
•
•
•
Np : 단위연료mol당product의수
Nr : 단위연료mol당reactant의수
(KJ/Kmol)
즉
react
prod H
H
W
Q
−
=
−
∑
−
+
=
p
f
p
prod
)
h
h
h
(
N
H
o
o
∑
−
+
=
r
f
r
react
)
h
h
h
(
N
H
o
o
(KJ/Kmol fuel)
(KJ/Kmol fuel)
(KJ/Kmol fuel)
특수한반응의경우
(연소enthalpy)가주어진다면
o
c
h
r
r
p
p
c
)
h
h
(
N
)
h
h
(
N
h
W
Q
o
o
o
−
−
−
+
=
−
∑
∑
(KJ/Kmol fuel)
정상유동과정은일(work)을동반하지않는다.
연소에서는mole로표현
B.C.Choi
10
②Closed System
Energy 보존식
react
prod U
U
W
Q
−
=
−
prod
U
react
U
: 생성물의내부에너지
: 반응물의내부에너지
(KJ/kmol
fuel)
v
p
h
u
−
=
v
P - )
h
h
h
( 
 )
u
u
u
(
f
f
o
o
o
o
−
+
=
−
+
r
f
r
p
f
p
)
v
P
-
h
h
h
(
N
)
v
P
-
h
h
h
(
N
W
Q
o
o
o
o
−
+
−
−
+
=
−
∑
∑
(KJ)
v
P 는고체, 액체에서무시가능.
기체의경우는이상기체로가정(Ru T)
내부에너지로표현:  생성내부에너지를
사용해야하지만, 
이것을피하기위해enthalpy의정의를이용.
o
fu


B.C.Choi
11
Reactant and product mixtures
Stoichiometric : 연료를완전연소시키기위한최소공기량
CxHy + a(O2+3.76N2) = x CO2 + (y/2)H2O + 3.76 a N2
a= x + y/4 ( by O balance : 2a = 2x +y/2)
The stoichiometric air-fuel ratio
(A/F)stoic = (mair/mfuel) = 4.76a/1 (MWair/MWfuel)
- Excess air ratio, λ = (A/F) / (A/F)stoic
- The equivalence ratio, φ = (A/F)stoic / (A/F) = 1/ λ
B.C.Choi
12
Enthalpy of Formation 
& Enthalpy of Combustion
atom
Chemical
energy
Latent energy
Sensible energy
molecular
핵에너지
-지금까지는화학에너지(분자구조), 잠재에너지및감지에너지만고려
핵에너지(원자구조)는불고려
-화학반응: 원자들을묶은분자로만드는화학결합이깨어지고
새로운분자가생성– 화학반응시화학에너지동반
-표준상태: 25℃, 1 atm (모든물질에동일기준상태제시) 
윗첨자“o”으로나타냄, 예) ho
f
연소공학에서는표준상태를m3
N 으로표현


B.C.Choi
13
Combustion
chamber
1kmol   C
1kmol O2
(at 25C, 1atm)
reactants
CO2
At 25C, 1atm
product
Qnet = -393 MJ/kmol
C + O2 =  CO2
발열반응(exothermic reaction) 
: 반응중화학에너지가열의형태로방출
Q – W = Hprod - Hreact = -393 MJ/kmol
열역학제1법칙에의거
Qnet + Σ Ni hi = Σ Ne he 
Qnet + Hr = Hp
Qnet = Hp - Hr
R
P
Steady State Flow
분자
분자
분자
Broken Chemical Bond
Sensible Energy
B.C.Choi
14
* Enthalpy of reaction  hr :
완전반응에대하여생성물의엔탈피와반응물의엔탈피차
* Enthalpy of combustion hc :
hc = Hp – Hr
표준상태(25C,1atm)에서
Δho
c = Hp – Hr = Σ Ne(ho
f)e - Σ Ni (ho
f)i
product        react.   
* Enthalpy of formation  hf :
주어진상태에서화학조성으로인한물질의엔탈피
kmol
kJ/kmol
Hr, hc는연소상태에따라변화
근원적상태량필요


B.C.Choi
15
Adiabatic Flame Temperatures
Combustion
Chamber
Fuel
Air
Products
Insulation
Tmax
Q = 0
r
f
r
p
f
p
)
h
h
h
(
n
)
h
h
h
(
n
W
Q
o
o
o
o
−
+
−
−
+
=
−
∑
∑
•
•
•
•
(KJ/s)
Q=0,
0
W =
react
prod
H
H
=
)
)
h
h
h
(
n
)
h
h
h
(
n
(
r
f
r
p
f
p
o
o
o
o
−
+
=
−
+
∑
∑
•
•
)
)
h
h
h
(
N
)
h
h
h
(
N
(
r
f
r
p
f
p
o
o
o
o
−
+
=
−
+
∑
∑
B.C.Choi
16
Adiabatic Flame Temperatures(Tad)
Ti
Tad
reactants
products
hr = hp
h(kJ/kg)
T
From 1st law of thermodynamics
Ur(Ti,Pi) = Up(Tad,Pf)
H=U+PV, U=H-PV
Hr – Hp – V(Pi – Pf) = 0
Pi V=Σni Ru Ti = Nr Ru Ti
Pf V =Σni Ru Tad = Np Ru Tad
Hr – Hp – Ru(Nr Ti – Np Tad) =0
Nr = mmix/MWr
Np = mmix/MWp
Hr – Hp – Ru (Ti mmix/MWr
– Tad mmix/Mwp) =0
hr – hp – Ru (Ti/MWr – Tad/MWp) =0


B.C.Choi
17
①연료1kg이완전연소
②연소가스Gw (Kg/Kg fuel)
③연소가스평균정압비열Cp KJ/(KgK)
④연소전온도, T0
l
H
V
LH
=
(kJ/kg)
Sensible Heat
Combustion
⑤Adiabatic flame Temp. = Tab
l
0
ab
pm
w
H
)
T
(T
C
G
=
−
0
pm
w
ab
T
C
G
H
T
+
=
∴
l
Fuel/Air ratio
1.0
CH4-Air
Tab
2200K
cp = (∂h/∂T)P
B.C.Choi
18
Calculation Tad.
react
prod
H
H
=
)
)
h
h
h
(
N
)
h
h
h
(
N
(
r
f
r
p
f
p
o
o
o
o
−
+
=
−
+
∑
∑
(1) 반응식: CxHy + a(O2+3.76N2) = xCO2 + (y/2)H2O (+bCO) + 3.76 a N2
a= x + y/4 
(2) 
(3) Reactants의물성치
)
)
h
h
h
(
N
)
h
h
h
(
N
(
r
f
r
p
f
p
o
o
o
o
−
+
=
−
+
∑
∑
8669
-110,530
CO
9364
-393,520
CO2
9904
-241,820
H2O(gas)
8669
0
N2
8682
0
O2
-
-249,950
C8H18(octane)
-
-118,910
C3H8(propane)
-
-74,850
CH4(methane)
h298K
(kJ/kmol)
ho
f
(kJ/kmol)
물질


B.C.Choi
19
(4) (x kmol CO2)[-393,520 + hco2 - 9364 (kJ/kmol CO2)]
+ (y/2 kmol H2O)[-241,820 + hH2O - 9904 (kJ/kmol H2O)]
+ (3.76 a kmol N2)[ 0 + hN2 - 8669 (kJ/kmol N2)]
= (1 kmol fuel, hf) [-249,950 kJ/kmol C8H18]
(5) x hco2 + y/2 hh2o + 3.76a hn2 – 5,896,000 = -249,950 kJ
x hco2 + y/2 hh2o + 3.76a hn2 = 5,646,000 kJ = D  
미지수가3개(color)지만실제미지수는온도하나,
왜, 이상기체엔탈피는온도만의함수이므로
(6) 첫번째D/(x+y/2+3.76a) = 88,200 kJ/kmol, 
이엔탈피값은, 생성물N2의경우2650K, H2O의경우2100K, CO2의
경우1800K에해당(Appendix A 참조)
생성물중질소비중이높으므로질소값(2650K)과유사한값을단열화염
온도로가정Æ 약2400K 가정
(7) 2400K에서각생성물의엔탈피(hco2, hh2o, hn2)를찾음.
(8) (7)엔탈피x 생성물의몰수= D  ?
(9) 아니면가정한단열온도값을조정하여맞을때까지반복계산
(보간법으로추정) 
* FOTRAN, C+, BASIC 등으로수치계산가능
Calculation Tad.  (m=1.0)
B.C.Choi
20
Tad of Octane (C8H18)
2,393
2,157
942
-
500
1,000
1,500
2,000
2,500
3,000
-
1.00
2.00
3.00
4.00
5.00
Air ratio  [  ]
Adiabatic Flame Temp. (K)
C8H18
CH4
C3H8


B.C.Choi
21
Chemical Equilibrium
gen.sys.
react
prod
S
T
Q
 
S
S
+
=
−
∫
δ
Reaction Chamber
ΔSsys
Sreact
Reactant
Products
Sprod
Entropy 
Change
Entropy transfer 
with heat
Entropy generation 
within system
보통어떤process에서entropy의생성은
0
S
S
S
surr
sys
gen
≥
+
∆
=
(KJ/K)
Q
(KJ/K)
단열, Q=0
과정중전체엔트로피는엔트로피형성식을계와외부비가
역성이발생하는주위를포함하는확장계로표현
2nd Law Considerations
B.C.Choi
22
react
prod
sys
S
S
S 
∆
−
=
는각성분의Entropy에대한공통기준이필요
- 따라서, 모든물질의entropy에대한공통기준을정해야한다.
→Third law of thermodynamics
“ 절대온도0 K에서순수결정물질의entropy는0이다.”-기준- 절대엔트로피
→반응물과생성물에서가스상태성분을이상기체로가정하여entropy를
결정할경우, entropy는이상기체에서도온도와압력의함수.
반응System 온도TR인저장소와QR의열량을교환; 밀폐반응
react
prod
sys
S
S
S
−
∆
=
∆
∑
∑
−
=
r
r
P
P
S
N
S
N
(KJ/K)
∑
=
∆
R
R
T
Q
surr
S


B.C.Choi
23
0
u
0
P
P
ln
R
)
P
(T,
S
P)
(T,
S
−
=
o
KJ/(Kmol·K)
Ideal gas mixture의i성분으로나타내면,
0
m
i
u
0
i
i
i
P
P
y
ln
R
)
P
(T,
S
)
P
(T,
S
−
=
o
KJ/(Kmol·K)
m
i
i
P
y
P =
Q
Pi : 분압
yi : 성분의mole분율
Pm : 혼합물의전체압력
0P
P
Rln
S 
−
=
∆
S(T,P)
P
P0=1 atm
)
P
(T,
S
0
o
S
T
T
이상기체-표준상태
- 이상기체혼합물에서
한성분의엔트로피계산시
그성분의분압이용
m
i
i
P
y
P =
Q
등온
B.C.Choi
24
2nd Law Analysis of Reacting Systems
Entropy 생성으로부터비가역성을계산
gen
0
u
rev
S
T
W
W
I
=
−
=
(KJ)
T0 : 주위의전개온도
State
Availability
Exergy
Reversible WORK
reactants
products
: Useful work
I : Irreversibility
u
W
Wu
I
계수행에서할수있는최대일


B.C.Choi
25
여기서
)
h
h
(
h
h
f
o
o
−
+
⇒
∑
−
−
+
=
r
0
f
r
rev
)
S
T
h
h
h
(
N
W
o
o
∑
−
−
+
−
p
0
f
p
)
S
T
h
h
h
(
N
o
o
정상유동연소과정에서
∑
−
+
+
=
•
•
)
S
T
gz
2
v
(h
m
W
i
0
i
2
i
i
i
rev
∑
−
+
+
−
•
)
S
T
gz
2
v
(h
m
e
0
e
2
e
e
e
(KW/s
)
(kW)
B.C.Choi
26
Chemical Equilibrium
2nd-law considerations
Complete combustion reaction
CO + 1/2O2 Æ CO2
[CO + 1/2O2]r Æ [(1-α)CO2 + αCO + α /2O2]p
The entropy of products,
Smix(Tf,P) =ΣNi s’i (Tf,Pi)
= (1-α)S’CO2 + αS’CO + α /2S’O2
Thermal dissociation
2CO2Æ 2CO + O2
0
u
0
P
P
ln
R
)
P
(T,
S
P)
(T,
S
−
=
o


B.C.Choi
27
at α=0.5, Smax,  
The entropy change internal to the system
ds≥0
The condition for equilibrium(더이상화학조성변화는없다)
(dS)U,V,m = 0
B.C.Choi
28
Gibbs function
Fixed energy system(질량과체적이일정)에서는
2nd law가chemical equilibrium을위해유용
ÆReal mixture(T,P, stoi.)에사용은불가
ÆGibbs function(G)를entropy 대신사용
; 열역학의물성을중요시
-일정질량으로구성된단순압축성시스템이일정온도, 
압력을가지고있다면
1st law 
: dQ-PdV=dU
2nd law 
: ds ≥dQ/T      dU+PdV-Tds ≤0
-Gibbs function
G = H – TS
- 양변미분
(dG)T,P = dH–TdS–SdT= (dU+PdV+VdP)-TdS-SdT
= dU + PdV - TdS
2nd law can be expressed as
(dG)T,P,m ≤0


B.C.Choi
29
Gibbs function
(dG)T,P,m ≤0
-일정온도, 압력하에서화학반응은Gibbs function을
감소시키는방향으로진행
-화학반응은Gibbs function이최소가될때equilibrium
dGmix = 0
G
dG=0
100%반응물
100%생성물
평형조성
dG<0
dG>0(2nd law 위배)
Entropy ?
B.C.Choi
30
Gibbs function of formation
Gibbs function for mixture of ideal gases
Gibbs function for ideal gases
Equilibrium condition


B.C.Choi
31
for general system
aA + bB + … ⇔eE + fF + ….
화학종몰수(dNi)
=이론반응계수(k)xmol수
k 공통Æ 생략
equilibrium
B.C.Choi
32
Standard-state Gibbs function change 
alternately
Kp:equilibrium constant
Statement of chemical equilibrium at cont. T and P 
ΔGT
o>0 : 반응물쪽으로진행
∵ln Kp<0 (Kp<1)
ΔGT
o<0 : ?


B.C.Choi
33
Principle of Le Chatelier
Thermal dissociation
1.
At any fixed T, 
increasing the pressure suppresses the dissociation.
2. At fixed P,
increasing the temp. promotes the dissociation.
B.C.Choi
34
Equilibrium Products of Combustion
Major product species 
for C3H8-air combustion at 1 atm
“complete-combustion”
Tmax=2278K, Φ=1.05(rich)
H2Omax at Φ =1.15
-연소열과비열이동시에감소
-Φ>1.05 
연소열이비열보다빠르게감소
At Φ =1.0, 
by thermal dissociation 
-presence of O2, CO, H2


B.C.Choi
35
Equilibrium Products of Combustion
Minor species distributions  
for C3H8-air combustion at 1 atm
- O, H radicals
- OH, NO radicals
- CO is minor species in lean
- O2 is minor species in rich
rich
lean
B.C.Choi
36
Report 1
1. Solve Example 2.8 to 2.10
(첨부program 실행)
2. Review question(p.69); odd No.
3.Problems(Chapter 2); 10, 14, 27,
38, 47 


# 과목1_연소공학_전남대 차시21 (1103285)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/3.pdf · 강의노트 PDF → md 변환물

1
CHOI
1
Chapter 3 
Mass Ttransfer
Chonnam Nat. Univ.,
School of Mechanical Engineering,
Prof. Byung-Chul Choi
CHOI
2
Rudiments of mass transfer
Mass transfer →molecular + turbulent 
processes
(1) Molecular →slow, small, spatial space
(2) Turbulent →velocity, eddy size
A
B(air)
V
e


2
CHOI
3
Study Objectives
1. Fick’s Law of Diffusion
2. Chemical Species Conservation
3. The Stefan Problem
4. Droplet Evaporation
CHOI
4
Mass transfer rate laws
Fick’s Law of Diffusion
One-dimensional binary diffusion
(species A→diffusion→B)
(kg/s-m2)
Mass flux
Binary diffusivity
(m2/s) (ref. App.D)
Fourier’s law of conduction 유사
고온
(고농도)
저온
(저농도)
부호가(-)


3
CHOI
5
Fick’s Law of Diffusion
The molar form of flux(kmol/s-m2)
mole fraction
mixture molar concentration(kmol/m3)
The total mass flux for a binary mixture
m’ ’’
flow            diffusion
YA : mass fraction
개별화학종의질량플럭스
6
Fick’s Low of Diffusion
ΣY i =1,   YA + YB = 1
The sum of the diffusional fluxes of species is zero.
Mass conservation requires Σm’ ”I,diff =0
Ordinary diffusion : 이성분혼합물의확산은화학종농도구배에의해결정
화학종확산영향인자: 온도, 압력
- 온도구배영향: thermal diffusion (Soret) effect
- 압력구배영향: pressure diffusion effect
Y : mass fraction


4
7
Molecular Basis of Diffusion
Mass diffusion of A molecular from a region 
of high concentration to low concentration
Average molecular properties derived 
from kinetic theory of gases.
kB : Boltzmann’s constant
mA: A molecule mass
ntot: number of molecules
CHOI
8
Molecular Basis of Diffusion
x-평면의A 분자의mass flux는양및음의방향움직임의차
mA},  
ρ=mtot /Vtot ,  1/Vtot = ρ /mtot
mass fraction(YA)
Z’’A=
앞의식에서
윗식에대입하면


5
9
Molecular Basis of Diffusion
A linear concentration distribution,
a= 2λ/3
From v’, λ,  PV= nkB T →확산계수의온도와압력변화를결정
PV=nkBT,   P=nkB/V T=ρT
ρDAB = (T3/2 P-1) ρ
= (T3/2 P-1) P/T
x-a        x        x+a
YA(x-a)
YA(x)
YA(x+a)
The mass flux of A→ρDAB
CHOI
10
Species Conservation
Control volume for 1-D analysis
of conservation of species A


6
CHOI
11
Species Conservation
mA,cv = YA mcv = YAρVcv = YAρ A Δx,    since Vcv= A Δx
양변에Aδx로나누고,   Δx→0,   미분형태로변환
Steady flow
CHOI
12
Species Conservation


7
CHOI
13
The Stefan Problem
Overall conservation of mass
기체B가액체A에녹지않고, 
실린더내부에는기체B의순이동량이없다.
Fick’s law
Diffusion of vapor A 
through a stagnant column of gas B
변수분리형으로
CHOI
14
The Stefan Problem
Diffusion of vapor A 
through a stagnant column of gas B
Initial condition(I.C.) at x=0
C= ln[1-YA,i]
Mass flux of A, B.C.: YA(x=L) = YA,∞
IC
BC
Mass flux는(밀도x확산계수)에비례,
Cylinder length L에반비례


8
CHOI
15
The Stefan Problem
Mass flux는(밀도x확산계수)에비례,
Cylinder length L에반비례
0
1
2
3
4
5
6
7
8
0
0.2
0.4
0.6
0.8
1
Y A,i
m."{ρ DAB/L}
N2 flow
A
온도변화로
증기압을변화
→계면질량분율
조정
16
Liquid-Vapor Interface Boundary Conditions
계면의질량분율Y A,i 측정이곤란→예측?
계면의기체분압은온도와관련
PA,i = Psat (Tliq.)
분압PA,i →몰분율X A,i = Psat /P
YA,i = Psat (Tiiq.)/P {MWA/MWmix,i }
계면의증기압구하는문제→계면온도문제
액체-증기온도연속성유지
Tliq,i (x=0-) = Tvap,i(X=0+) = T(0)
Energy balance
Q.g-i - Q.g-l = m.(hvap-hliq)= m.hfg
→Q.net = m.hfg
m.(증발율)알면열전달률(Q.net) 구할수있다.    
x=0
interface
Q.g-i
Q.i-l
m.hvap
m.hliq


9
CHOI
17
Droplet Evaporation
Evaporation of a liquid droplet
Droplet : mass and energy conservations
Droplet vapor / ambient gas mixture;
mass and energy conservations
droplet vapor(species) conservation
Assumptions
1. Quasi-steady
2. Droplet temp.= const.
3. Droplet surface의mass fraction은
그온도의liquid-vapor 평형으로결정
4. Thermophysical properties = const.
18
Evaporation Rate
Overall mass conservation
Boundary condition,
.
Integrating
C 처리
액적증기의화학종보존법칙


10
CHOI
19
Evaporation Rate
YA= YA,∞    at r→∞
Transfer number, BY
ln 안의수이므로ln(0)은없다.
따라서전체가0이되는경우ln (1)~
Evaporation Rate
CHOI
20
Droplet Mass Conservation
= ρl 4πr3/3 = ρl πD3/6
d/dt(ρl πD3/6) =  
Evaporation constant K;
Evaporation Rate
Droplet mass
3D2π ρl/6(dD/dt) = ditto  
DdD = -4 {2rsρDAB/Dρl ln(1+BY)}dt
∫ DdD = -4 ∫{ρDAB/ρl ln(1+BY)}dt
Do→0, time 0→td
½(-D0
2)=-4{           }t
-D0
2 = -8{               } td = -Ktd
D0
2=Ktd
.
Droplet life time


11
CHOI
21
Droplet Mass Conservation
D2 law
Droplet life time, td
D=0, t=td
0=Do
2-K td
td = Do
2 /K
B
CHOI
22
Droplet Mass Conservation
D2 law : td = Do
2 /K
Ex3.2)  n-dodecane (C12H26)
{C1-metha, C2-etha, C3-propa, C4-buta, C5-penta , C6-hexa, 
C7-hepta, C8-octa, C9-nona, C10-deca} 
D-100 um, P=1 atm, ρl=749 kg/m^3, Ts=Tboil – 10, ρ=ρlN2atT=800K, 
td=?
(1) 주어진조건에서물성치를구함: Tboil, hfg, MWA=170, DAB
(2) Psat/P 구함by Clausius-Clapeyton eq.:
(3) YA,s구해서BY 구함
(4) ρDAB(T) 구해서K 구함
(5) td = D2/K 구함


12
CHOI
23
Report Chapter 3
1. Problems : 3.3, 3.6, 3.9, 3.11
Hydrate
Project 1
Stefan Problem 실험하기.
(1) 일정한용기에휘발성이강한소정량의연료를
넣고증발시간측정, m’fuel구하여, m’ “구함
(2) 식(3.40)에서이론적으로구한m’ “와비교
(3) 실험치와이론치의오차의원인분석?


# 과목1_연소공학_전남대 차시21 (1103286)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/4.pdf · 강의노트 PDF → md 변환물

1
Choi
1
Chonnam Nat. University
School of  Mechanical Systems Engineering,
Prof. Byungchul Choi
Chapter 4
Chemical  
Kinetics
Choi
2
- Chemical kinetics
: the elementary reactions
the reaction rate  
- Combustion
: complex flow field
chemistry
- Objective:
Basic chemical kinetics  
concepts of combustion


2
Choi
3
Global vs. Elementary Reaction
Global reaction mechanism
F + aOx →b Pr
The fuel consumption rate
Xi : molar concentration (kmol/m3)
kG(T) : the global rate of coefficient, T function
n, m : the reaction order
→Real combustion : involving intermediate species
Choi
4
Global vs. Elementary Reaction
Global reaction
2H2 + O2 →2H2O
Elementary reaction
H2 + O2 →HO2 +H
H + O2 →OH + O
OH + H2 →H2O + H
H + O2 + M →HO2 + M 
where, H, OH, HO2 : radicals


3
Choi
5
Elementary Reaction Rates
Bimolecular reactions & collision theory
A + B →C + D
The reaction rate
(kmol/m3-s)
kbimolec : the global rate coefficient (temp. function)
Arrhenius form,
k(T)=A exp {-EA/(Ru T)}
EA : activation energy
Ru :기체상수
A:frequency factor
ln k
1/T  (1/K)
기울기
= -EA/Ru
Choi
6
Collision theory
The collision frequency for identical moleculars 
by Maxwellian velocity distribution
σA + σB = 2 σAB
수밀도
dt 동안분자가통과해
지나가는원통의체적
한개분자A가모든B 분자와
충돌할확율
평균속도; 온도의존성고려


4
Choi
7
Collision theory
Chapter 3, (3.10a) v’=(8kBT/(πmA))1/2
환산질량
Choi
8
Collision theory
Reaction rates와결합하기위하여
NAV : Avogadro number (6.022 x 1026 molecules/kmol)
충돌이반응으로될확률=[에너지인자] x [입체인자],
= activation energy(EA) x geometric or steric factor


5
Choi
9
Collision theory
Bimolecular rate coefficient by collision theory
Bimolecular rate coefficient by Arrhenius form
Current practice Arrhenius form
Choi
10
Rates of Reaction for Multistep Mechanisms
Net Production Rates
The elementary reactions
The rates destroying O2;
for H atoms;
(R.1)
(R.2)
(R.3)
(R.4)
d[H2]/dt, d[O]/dt= ?


6
Choi
11
Rates of Reaction for Multistep Mechanisms
Compact Notation
(R.1)
(R.2)
(R.3)
(R.4)
reactants
products
Choi
12
Rates of Reaction for Multistep Mechanisms
Stoichiometric coefficients (이론반응계수)
(R.1)
(R.2)
(R.3)
(R.4)
R1
R2
R3
R4
reactants
products
O2 H2 H2O HO2 O H  OH  M
Useful in solving chemical kinetics
problems using a computer


7
Choi
13
Rates of Reaction for Multistep Mechanisms
The net production rate of each species,
where stoichiometric coefficient(이론반응계수)
and  rate-of-progress variable for ith elementary
For example, q1 for R1 reaction ;
CHEMKIN(Sandia)
8
4
= -1
H2 + O2 →HO2 + H
Choi
14
Relation between Rate Coefficients and 
Equilibrium Constants
For bimolecular reaction
For species A
Equilibrium;
Reaction coefficient (Kc)


8
Choi
15
Relation between Rate Coefficients and Equilibrium Constants
→
Equilibrium Constants by Chapt.2
Relation between mole concentration and mol. fraction,
partial pressure
Kp = Kc(RuT/Po)(c+d+…-a-b-…)
Pi=Xi RuT
=
{XcRuT/Po}c {XDRuT/ Po}d ….
{XARuT/Po}a {XBRuT/ Po}b ….
Xc
c XD
d …
XA
a XB
b … 
=                {RuT/ Po}c+d+… -a-b-…
Why Kc=?
Choi
16
Relation between Rate Coefficients and 
Equilibrium Constants
For a bimolecular reaction, Kc=Kp
정반응속도(kf(T))와
평형상수(kc(T))를알면
역반응속도(kr(T))를알수있다.


9
Choi
17
Steady-State Approximation
Zeldovich mechanism
Combustion ;
-formation of some radicals
-Simplify to steady-state
since radicals are destroyed as rapidly.
Steady-state concentration of N atoms: d[N]/dt→0
Steady-state concentration of N
→The time rate-of-change
Choi
18
Steady-State Approximation
O2 →kp→2O ,          N + OH →NO + H 
N2 + O2 →kG→2NO
d[NO]/dt = kG [N2]m[O2]n
→Determine kG, m and n using the elementary rate coefficient.
( report, important )
Zeldovich mechanism
slow reaction - 지배적
fast reaction


10
Choi
19
Thermal NOx
공기중의질소가1800K 이상의고온에서산화되어생성
확대Zeldovich Mechanism
N2 + O
NO + N    (1)
O2 + N
NO + O    (2)
N + OH
NO + H  (3)
Zeldovich NO는생성속도가연소반응에비해느리고, 
주로화염후류의고온영역에서생성
Choi
20
Mechanism of NO formation
Zeldovich mechanism
O + N2   (k1+) +→←- (k1-)   NO + N  (1)
N + O2   (k2+) +→←- (k2-)   NO + O   (2)
Extended Zeldovich mechanism
N + OH   (k3+) +→←- (k3-)  NO + H   (3)
A + B  (k)→ C + D
Reaction rate
d[A]/dt = - k [A][B],
k : the rate coefficient, m3/kmol-s 
Arrhenius form , k(T) = A Tb exp(-EA/RuT)


11
Choi
21
이론계산치
 
NO][H]
[
-
N][OH]
[
NO][O]
[
-
    
          
N]
][
O
[
NO][N]
[
]
O
][
N
[
NO]
[
3
3
2
2
2
1
2
1
b
f
b
f
b
f
K
K
K
K
K
K
dt
d




   
NO][H]
[
N][OH]
[
-
NO][O]
[
  
          
N]
][
O
[
-
NO][N]
[
-
O]
][
N
[
N]
[
3
3
2
2
2
1
2
1
b
f
b
f
b
f
K
K
K
K
K
K
dt
d



OH]
[
]
O
[
NO]
[
NO][H]
[
NO][O]
[
O]
][
N
[
N]
[
3
2
2
1
3
2
2
1
f
f
b
b
b
f
K
K
K
K
K
K





about N
N = low concentration 
d[N]/dt=0 (the steady-state approximation)
Choi
22
or
1 - [NO]2/(K[O2][N2])
d[NO]/dt = 2k1
+ [O][N2] -------------------------------------------
1 + k1
- [NO]/(k2
+ [O] + k3
+ [OH])
K = (k1
+/k1
-)/(k2
+/k2
-)
  
OH]
[
]
O
[
NO]
[
NO][H]
[
NO][O]
[
O]
][
N
[
     
          
OH])
[
]
O
[
NO]
[
(-
     
          
NO][H]
[
-
NO][O]
[
-
O]
][
N
[
NO]
[
3
2
2
1
3
2
2
1
3
2
2
3
2
2
1
f
f
b
b
b
f
f
f
ib
b
f
f
K
K
K
K
K
K
K
K
K
K
K
K
dt
d











12
Choi
23
d[NO]/dt = 2k1
+ [N2][O]
O, OH, H radical
1/2 O2
+keO  →O    equilibrium constant
keO=[O]/[O2]1/2 ,   [O]=keO [O2]1/2
근사치
d[NO]/dt = 2 k1
+ [N2] [O]
= 2 k1
+ [N2][keO [O2]1/2]
d[NO]/dt = 2 k1
+ keO [N2] [O2]1/2
k(T) = ATaexp(-EA/RuT)
Temp. K
k
=NO
A + B  (k)→ C + D
Reaction rate
d[A]/dt = - k [A][B]
at lean-burn, less [NO] reaction,
compare with [N2],[O2] reaction
[NO]=k3+=k3- =0
K1+ =7.6 x 1013 exp(-38,000/T) 
cm3/mol.s,   2000-5000K
Kp=(Po/po) / (Po2/po)1/2
Choi
24
Chain Reactions
The chain-initiation reaction
A2 + M →k1→A + A + M
The chain-propagating reactions
A + B2 →k2→AB + B
B + A2 →k3→AB + A
The chain-terminating reactions
A + B + M →k4→AB + M
초기안정된화학종
반응에서는역반응무시


13
Choi
25
Chain Reactions
For the radicals A and B, the steady-state approximation.
d[A]/dt= 2k1[A2][M]-k2[A][B2]+k3[B][A2]-k4[A][B][M]=0
d[B]/dt= k2 [A][B2]-k2 [B][A2]-k4[A][B][M]=0
B도같은방법으로구한다.
그리고[A2], [B2], [M]의초기값을알면,
→d[A2]/dt, d[B2]/dt, d[AB]/dt를구할수있다.
Chain-branching reactions;
O + H2O →OH + OH
Choi
26
Chapter 4
Report
(1) Ex4.1, 4.2, 4.3, 4.4
(2) Question and Problems 4.5, 4.11, 4.17
(3) Extended Zeldovich mechanism에서
d[NO]/dt=? 를구하라.


# 과목1_연소공학_전남대 차시21 (1103287)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/5.pdf · 강의노트 PDF → md 변환물

1
Chapter 5
Chemical Mechanisms
Microgravity
combustion
Choi
1
Chonnam Nat. Univ.,
School of Mechanical Systems Engineering,
Prof. Byung-Chul Choi
The H2-O2 System
The initiation reactions
Chain-reaction steps involving O H and OH radicals
Rocket propulsion combustion,
CO and CxHy combustion
Chain reaction steps involving O, H, and OH radicals
Chain-terminating steps involving O, H, and OH radicals
Choi
2
the three-body


2
Involving HO2, H2O2
(active H.2 reverse reaction, HO2 + H Æ H2 + O2)
The H2-O2 System
Choi
3
The H2-O2 System
Explosion limits for a stoichiometric 
H2-O2 mixture in a spherical vessel
H2O2의연쇄분기반응
No Explosion
연쇄반응> 소멸반응
RadicalÆ absorbed products
연쇄정지반응
Choi
4
Explosion
벽면에서활성기파괴
RadicalÆ absorbed products
Heterogeneous reaction
연쇄반응 
멸반응
압력증가; 온도급상승
활성기농도선형적증가


3
CO Oxidation
Hydrocarbon (CxHy) Æ CO, CH, CH2O Æ CO2 combust.(reaction)
Slow reaction, initiator of the chain sequence
CO oxidation, H, the chain-branching step
H2 instead of H2O
이때앞의H2-O2 반응시스템을
적용할필요
Choi
5
적용할필요
Oxidation of higher Paraffins
CnH2n+2, n>2   Reaction Processes
I.
The fuel is attacked by O and H atoms 
and breaks down olefins and H2.
II. The olefins oxidize to CO, HCHO
and H2. H2 is converted to H2O.
III.   CO + OH Æ CO2 + H with heat release processes.
Choi
6


4
Oxidation of higher Paraffins
CnH2n+2, n>2, Parffins or Alkanes
Choi
7
Oxidation of higher Paraffins
C3H8 Propane
I.
Broken C-C bond
C3H8 + M Æ C2H5 + CH3 + M
Bond energy
H-H : 104 kcal/mol
C C
85
“
3
8
2
5
3
II.
Break down further, olefins, H
C2H5 + M Æ C2H4 + H + M
CH3 + M Æ CH2 + H + M
III. H Æ new radicals
H + O2 Æ O + OH
IV. Open up new fuel molecule attack pathways
Æ
C-C :   85 
“
C-H :   98
“
O-H :  109 
“
C-O :   86 
“
C=C :  143 
“
C≡C : 194 
“
Choi
8
C3H8 + OH Æ C3H7 + H2O
C3H8 + H Æ C3H7 + H2
C3H8 + O Æ C3H7 + OH
V.
HC radicals react with H and following β–scission rule
C3H7 + M Æ C3H6 + H + M (or C2H4 + CH3 + M)


5
Oxidation of higher Paraffins
β–scission rule
C3H7 + M Æ
C3H6 + H + M
Æ
C2H4 + CH3 + M
C-C, C-H 결합이깨지는곳은
활성기위치(비공유전자쌍)로부터
떨어진곳
H2O
Choi
9
Oxidation of higher Paraffins
C3H8 Propane
VI. Broken C-C bond
C3H6 + O Æ C2H5 + HCO(formyl radical)
3
6
2
5
(
y
)
C3H6 + O Æ C2H4 + HCHO(formaldehyde)
VII. CH3, HCHO, CH2 radical oxidation
VIII. CO oxidation 
Choi
10


6
Global and Quasi-Global Mechanisms
Choi
11
Global and Quasi-Global Mechanisms
C3H8 Oxidation  (n=3)
Ref. Table 5.2 
x, K, a, b, c
3     8
Choi
12
d


7
Methane Combustion
277 elementary reaction involving 49 species
Choi
13
:::::::::::
279 NH3 + O Æ NH2 + OH
Methane Combustion
High-Temp. Reaction Pathway Analysis 
Choi
14


8
Methane Combustion
Low-Temp. Reaction Pathway Analysis
Low-temp. reaction
Choi
15
High-temp. reaction
Oxides of Nitrogen Formation
1. Thermal (or Zeldovich) mechanism
2. Prompt(Fenimore) mechanism
3 N2O intermediate mechanism
3. N2O intermediate mechanism
Extended Zeldovich mechanism
Choi
16


9
Oxides of Nitrogen Formation
Prompt(Fenimore) mechanism
Choi
17
Oxides of Nitrogen Formation
N2O intermediate mechanism
In fuel-lean (Φ<0.8), low temperature conditions
Choi
18


10
Chapter 5
Homework
Question and Problems
5.5, 5.8, 5.10, 5.13 B.
Choi
19


# 과목1_연소공학_전남대 차시21 (1103288)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/6.pdf · 강의노트 PDF → md 변환물

1
Chapter 6
Chemical and Thermal 
Analyses of Reacting System
Analyses of Reacting System
Choi
1
Chonnam Nat. Univ.
School of Mechanical Systems Engineering
Prof. Byung-Chul Choi
Chemical Reacting Systems
Choi
2


2
Constant-Pressure, Fixed-Mass Reactor
Conservation of Energy
(1)
h = u + Pv, u = h - Pv
Only work (P-dv work) at the piston 
(2)
Choi
3
(3)
Substituting (2), (3) into (1)
(4)
Conservation of Energy
(5)
Constant-Pressure, Fixed-Mass Reactor
(6)
(7)
Substituting (7)-(9) into (6)
Energy conservation
미분
Choi
4
(8)
(9)
Energy conservation
Chemical production


3
Constant-Pressure, Fixed-Mass Reactor
For mass conservation
Ni = V [Xi], dNi/dt = V ω’i
i
id
l
l
li i
dV/d
(13)
Choi
5
using ideal-gas law to eliminate dV/dt
Constant-Pressure, Fixed-Mass Reactor
P=const. PV = ΣNi RuT,  PdV/dt= ………..??
(14b)
Substituting (14b) into (13b)
(
b)
V/Nj = 1/[Xj],
Choi
6
j
[
j],
The rate of change of the species molar concentration


4
Constant-Volume, Fixed-Mass Reactor
Q’ – W’ = m du/dt, W’=0
Conservation of Energy
for ideal-gases
From (5)-(7)
Choi
7
for ideal gases
Constant-Volume, Fixed-Mass Reactor
To calculate dP/dt
Conservation Laws
Applying [Xi], ω’i,  Ni = V [Xi], 
dNi/dt = V ω’i
Choi
8


5
Constant-Volume, Fixed-Mass Reactor
Project 2
Solve example 6.1)
Change fuel and properties,
CH4, C3H6 , C3H8, 
C4H10, C8H18, 
CH3OH
D
d t
O t 29 2008
Choi
9
Due date : Oct. 29, 2008.
Well-Stirred Reactor
Mass conservation eq.
Choi
10
-Flame stabilization
-NOx formation
called Longwell reactor


6
Well-Stirred Reactor
The continuity eq.
The mass generation rate
Production rate
Ignoring diffusional flux species mass flow rate
Longwell reactor
inch
Choi
11
Ignoring diffusional flux, species mass flow rate
m’i = m’ Yi
Steady-state, dm/dt=0
Well-Stirred Reactor
완전혼합반응기,
완전혼합반응기,
출구질량분율=내부”
Conservation of Energy  Eq.
N개방정식과, N+1개미지수
나머지하나방정식(T)
Steady-state, steady-flow, well-stirred
Ignoring PE KE
Choi
12
Ignoring PE, KE
Temperature ?


7
Well-Stirred Reactor
A mean residence time :
Where,
ρ = P MWmix/(Ru T)
Choi
13
Plug-Flow Reactor
Assumptions
1 St
d
t t
t
d
fl
1. Steady-state, steady-flow
2. No mixing in the axial direction.
3. Uniform properties, one-D flow.
4. Ideal friction flow.
5. Ideal-gas behavior. 
Choi
14


8
Plug-Flow Reactor
Conservation laws
Choi
15
Mass conservation
x-momentum conservation
Plug-Flow Reactor
Conservation laws
Choi
16
Energy conservation
Species conservation


9
Plug-Flow Reactor
Conservation laws
Rearrange of the mass and energy conservations
Choi
17
Plug-Flow Reactor
Species conservation
Rearrange of the mass and energy conservations
h=h(T, Yi),          dh/dx, dT/dx
Rearrange of the momentum conservations
Choi
18
Rearrange of the momentum conservations,
differentiate the ideal-gas eq. of state


10
Plug-Flow Reactor
이상의식들로부터
Choi
19
Plug-Flow Reactor
Initial conditions
A residence time tR
dtR/dx = 1/vx
Choi
20


11
Homework Chapter 6
Project Ex6 1)
Project Ex6.1)
Problems 6.1, 6.7
Choi
21


# 과목1_연소공학_전남대 차시21 (1103289)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/7.pdf · 강의노트 PDF → md 변환물

2010-10-22
1
Chapter 7
Conservation Equations for  
Reacting Flows
Reacting Flows
1
Chonnam Nat. Univ.
School of Mechanical Systems Engineering
Prof. Byung-Chul Choi
To present the governing equations expressing the 
conservation of mass, species, momentum, and 
Objectives
energy for reacting flows.
1. Steady flow for a 1-D planar(x-coord.) geometry
2. Steady flow for a 1-D spherical(r-coord.) 
geometry
3 Steady flow for a 2 D axisymmetricr(r and x
2
3. Steady flow for a 2-D axisymmetricr(r-and x-
coord.) geometry


2010-10-22
2
Overall Mass Conservation (Continuity)
[ ]
[ ]
x
x
x
cv
m
m
dt
dm
Δ
+
−
=
&
&
Rate of 
increase 
f
Mass 
flow
i t
CV
Mass 
flow 
t
f CV
dmcv/dt
[x’]x
[x’]x+ Δx
Control
volume
Control
Surface, A
of mass
into CV
out of CV
Δx
(
)
[
] [
]
x
x
x
x
x
x
A
v
A
v
dt
x
A
d
Δ
+
−
=
Δ
ρ
ρ
ρ
(
)
0
v
d
x
ρ
mcv = ρVcv = ρ AΔx, (Vcv = AΔx)
Divide AΔx, ΔxÆ0
∂/ ∂t 0
(
)
v
∂
∂
ρ
ρ
3
(
)
0
=
dx
x
ρ
constant
=
xv
ρ
∂ρ/ ∂t=0
(
)
x
v
t
x
∂
∂
=
∂
∂
ρ
ρ
(
)
0
=
⋅
∇
+
∂
∂
V
t
ρ
ρ
Rate of gain 
of mass/volume
Net rate of mass 
flow out/volume
(
)
(
)
0
sin
1
)
sin
(
sin
1
1
2
2
=
∂
∂
+
∂
∂
+
∂
∂
φ
ρ
θ
θ
ρ
θ
θ
ρ
φ
θ
v
r
v
r
v
r
r
r
r
For the spherical system,
(
)
0
1
2
2
=
rv
r
dr
d
r
ρ
constant
2
=
rv
r ρ
For 1-D, vθ=vφ=0
For axisymmetric system(2-D) with steady flow
θ
r
4
(
)
(
)
0
1
=
∂
∂
+
∂
∂
x
r
v
x
v
r
r
r
ρ
ρ
For axisymmetric system(2-D) with steady flow,
x
r


2010-10-22
3
Species Mass Conservation 
A
A
AB
A
m
dx
dY
D
Y
m
dx
d
′′′
=
⎥⎦
⎤
⎢⎣
⎡
−
′′
&
&
ρ
⎞
⎛
From Chapt.3 (3.31)
i
i
i
m
m
t
Y
′′′
=
′′
⋅
∇
+
∂
∂
&
&
)
(ρ
for i = 1,2,…N
(
)
A
A
AB
A
m
dx
dY
D
dx
d
Y
m
dx
d
′′′
=
⎟
⎠
⎞
⎜
⎝
⎛
−
′′
&
&
ρ
flow            diffusion                 production 
by reaction
General vector form,
Net rate of mass production of i/vol
5
Net rate of mass production of i/vol.
Net rate of mass flow of i out by diffusion and bulk flow/vol.
Rate of gain of mass of i /vol.
m’i”: mass flux,   vi : mass average (bulk) velocity
i
i
i
v
Y
m
ρ
=
′′&
∑
=
i
iv
Y
V
Species Mass Conservation 
Diffusional velocity,  vi,diff = vi - V
dff
i
i
i
diff
i
Y
Y
,
(
,
)
v
V
v
m
i
ρ
ρ
=
−
=
′′
&
iv
m
i
i
Y
ρ
=
′′
&
Æ
m
i
i
iY
t
Y
& ′′′
=
+
⋅
∇
+
∂
∂
)]
(
[
)
(
diff
i,
v
V
ρ
ρ
diff
i
i
i
i
Y
,
m
m
m
′′
+
′′
=
′′
&
&
&
Bulk flow   diffusion
dff
i
i
i
i
i
Y
Y
Y
,
v
V
v
ρ
ρ
ρ
+
=
for i=1,2,…, N
6
A
AB
A
i
A
Y
D
Y
∇
−
′′
=
′′
ρ
m
m
&
&
The general form of Fick’s law


2010-10-22
4
(
)
i
i
m
m
r
dr
d
r
′′′
=
′′
&
&
2
2
1
i = 1,2,…N
For spherically symmetric system
i
i
i
m
m
t
Y
′′′
=
′′
⋅
∇
+
∂
∂
&
&
)
(ρ
Considering binary diffusion
A
A
AB
A
r
m
dr
dY
D
Y
v
r
dr
d
r
′′′
=
⎥⎦
⎤
⎢⎣
⎡
⎟
⎠
⎞
⎜
⎝
⎛
−
&
ρ
ρ
2
2
1
(
)
Y ⎤
⎡
∂
∂
∂
∂
1
1
1
Considering binary diffusion
For axisymmetric system (r-, x-coordinates)
x
r
7
(
)
A
A
AB
A
x
A
r
m
r
Y
D
r
r
r
Y
v
r
x
r
Y
v
r
r
r
′′′
=
⎥⎦
⎤
⎢⎣
⎡
∂
∂
∂
∂
−
∂
∂
+
∂
∂
&
ρ
ρ
ρ
1
)
(
1
1
Mass flow of radial convection
Mass flow of axial convection
Molecular diffusion
Mass production
by chemical 
reaction
Momentum Conservation 
One-Dimension Forms
∑
Forces
Viscous forces & gravitational body forces
8
[
]
[
]
[ ]
[ ]
(
)
x
x
x
x
x
x
x
x
v
v
m
PA
PA
−
=
−
Δ
+
Δ
+
&
∑
−
=
in
out
V
V
m
m
F
&
&
Viscous forces & gravitational body forces
무시


2010-10-22
5
dv
dP
Momentum Conservation 
One-Dimension Forms
ΔxÆ 0 differential eq.
dx
dv
m
dx
dP
x
′′
=
−
&
dx
dv
v
dx
dP
x
x
ρ
=
−
m’” = ρvx
For the 1-D laminar premixed flame, droplet combustion,
1-D Euler equation
9
(
)
0
2
/
2
≈
=
dx
dv
v
dx
v
d
x
x
x
0
=
dx
dP
p
,
p
,
kinetic energy change across the flame is small;
Momentum equation 
Pressure= const.
유동장전체압력이일정함
Momentum Conservation 
Two-Dimension Forms
m
g = ρΔx Δy g 중력작용
τxx= 수직점성응력
mcv gx = ρΔx Δy gx 중력작용
(x-방향작용힘=
[
]
[
]
(
)
( ) [ ]
[ ]
(
) ( )
[ ]
[ ]
(
)
( )
( )1
1
1
1
g
y
x
y
P
P
x
y
y
yx
y
y
yx
x
xx
x
x
xx
Δ
Δ
+
Δ
−
+
Δ
−
+
Δ
−
Δ
+
Δ
+
ρ
τ
τ
τ
τ
x-방향힘의합은cv를통과하는x-
방향의순흐름량과같다.
: momentum conservation
10
x-, y-면작용운동량)
[ ]
[ ]
(
)
( )
( )
[
]
[
]
(
)
[
]
[
]
(
) ( )1
)1(
1
1
x
v
v
v
v
y
v
v
v
v
g
y
x
y
P
P
y
x
y
y
y
x
y
x
x
x
x
x
x
x
x
x
x
x
Δ
−
+
Δ
−
=
Δ
Δ
+
Δ
−
+
Δ
+
Δ
+
Δ
+
ρ
ρ
ρ
ρ
ρ


2010-10-22
6
Two-Dimension Forms
[
]
[
]
(
)
( ) [ ]
[ ]
(
) ( )
[ ]
[ ]
(
)
( )
( )
[
]
[
]
(
)
[
]
[
]
(
)
)1(
1
1
1
1
y
v
v
v
v
g
y
x
y
P
P
x
y
x
x
x
x
x
x
x
x
x
x
x
y
yx
y
y
yx
x
xx
x
x
xx
Δ
−
=
Δ
Δ
+
Δ
−
+
Δ
−
+
Δ
−
Δ
+
Δ
+
Δ
+
Δ
+
ρ
ρ
ρ
τ
τ
τ
τ
[
]
[
]
(
) ( )1
x
v
v
v
v
y
x
y
y
y
x
y
Δ
−
+
Δ
+
ρ
ρ
(
)
(
)
x
yx
xx
x
y
x
x
g
x
P
y
x
y
v
v
x
v
v
ρ
τ
τ
ρ
ρ
+
∂
∂
−
∂
∂
+
∂
∂
=
∂
∂
+
∂
∂
Momentum flow
force
ΔxÆ 0, ΔyÆ 0 differential eq. for x-direction
Δx Δy 로나누고
11
(
)
(
)
y
yy
xy
y
y
y
x
g
y
P
y
x
y
v
v
x
v
v
ρ
τ
τ
ρ
ρ
+
∂
∂
−
∂
∂
+
∂
∂
=
∂
∂
+
∂
∂
A similar procedure, the steady-flow y-component of ME
(
)
(
)
(
)
r
g
x
P
r
x
r
r
r
v
v
r
r
v
v
r
x
x
xx
rx
r
x
x
x
ρ
τ
τ
ρ
ρ
+
∂
∂
−
∂
∂
+
∂
∂
=
∂
∂
+
∂
∂
Two-Dimension Forms
Cylindrical coordinates
Axial (x) component
x
r
x
x
r
r
x
∂
∂
∂
∂
∂
(
)
(
)
(
)
r
P
r
x
r
r
r
v
v
r
r
v
v
r
x
rx
rr
r
r
x
r
∂
∂
−
∂
∂
+
∂
∂
=
∂
∂
+
∂
∂
τ
τ
ρ
ρ
Radial (r) component
Viscous stresses for Newtonian fluid
12
(
)⎥⎦
⎤
⎢⎣
⎡
⋅
∇
−
∂
∂
=
V
3
2
2
x
vx
xx
μ
τ
(
)⎥⎦
⎤
⎢⎣
⎡
⋅
∇
−
∂
∂
=
V
3
2
2
r
vr
rr
μ
τ
⎥⎦
⎤
⎢⎣
⎡
∂
∂
+
∂
∂
=
x
v
r
v
r
x
rx
2
μ
τ
Fluid viscocity


2010-10-22
7
(
)
(
)
x
v
rv
r
r
x
r
∂
∂
+
∂
∂
=
⋅
∇
1
V
(
)
r
r
xx
∂
〉〉
∂
τ
τ
Two-Dimension Forms
For axisymmetric system (r-, x-coordinates), Jet flame(Chapt.8)
(
)
x
r
r
r
rx
∂
〉〉
∂
τ
r
vx
rx
∂
∂
= μ
τ
x
v
r
v
r
x
∂
∂
〉〉
∂
∂
- 경계층두께가길이에비해매우짧다.
- 흐름방향속도변화보다반경방향변화가크다.
13
- 축방향속도성분이반경방향속도성분
보다매우크다(vx>>vr).
(
)
(
)
x
v
rv
r
r
x
r
∂
∂
+
∂
∂
=
⋅
∇
1
V
(
)
r
r
xx
∂
〉〉
∂
τ
τ
Two-Dimension Forms
For axisymmetric system (r-, x-coordinates), Jet flame(Chapt.8)
- 경계층두께가길이에비해매우짧다.
- 흐름방향속도변화보다반경방향변화가크다.
- 축방향속도성분이반경방향속도성분
보다매우크다(
>> )
(
)
x
r
r
r
rx
∂
〉〉
∂
τ
r
vx
rx
∂
∂
= μ
τ
x
v
r
v
r
x
∂
∂
〉〉
∂
∂
(
)
(
)
r
g
x
P
r
r
v
r
r
v
v
r
r
v
v
r
x
x
x
r
x
x
x
ρ
μ
ρ
ρ
+
∂
∂
−
⎟
⎠
⎞
⎜
⎝
⎛
∂
∂
∂
∂
=
∂
∂
+
∂
∂
Axial (x) momentum equation
보다매우크다(vx>>vr).
x
r
14
x
r
r
r
x
∂
⎠
⎝
∂
∂
∂
∂
g
x
P
x
P
∞
∞
−
=
∂
∂
≈
∂
∂
ρ
(
)
(
)
(
)
r
g
x
P
r
x
r
r
r
v
v
r
r
v
v
r
x
x
xx
rx
r
x
x
x
ρ
τ
τ
ρ
ρ
+
∂
∂
−
∂
∂
+
∂
∂
=
∂
∂
+
∂
∂
Radial ME, ∂P/∂r은매우작다. 
Jet 내부압력변화
Jet 외부압력변화
중력반대방향으로분사
부력과중력에의한효과가상쇄


2010-10-22
8
(
)
(
)
(
)g
v
r
v
v
r
v
v
r
x
ρ
ρ
μ
ρ
ρ
+
⎟⎞
⎜⎛
∂
∂
=
∂
+
∂
1
1
1
Finally, axial(x) momentum equation
Two-Dimension Forms
(
)
(
)
(
)g
r
r
r
r
v
v
r
r
r
v
v
r
x
r
r
x
x
x
ρ
ρ
μ
ρ
ρ
−
+
⎟
⎠
⎜
⎝
∂
∂
=
∂
+
∂
∞
Buoyant force
Viscous force
x-momentum flow
by radial convection
x-momentum flow
b
i l
i
15
by axial convection
x
r
Energy Conservation 
1-D Forms
16
(
)
⎥
⎥
⎦
⎤
⎢
⎢
⎣
⎡
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
+
+
−
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
+
+
′′
=
−
′′
−
′′
Δ
+
Δ
+
x
x
x
x
x
cv
x
x
x
gz
v
h
gz
v
h
A
m
W
A
Q
Q
2
2
2
2
&
&
&
&
The 1st law of thermodynamics


2010-10-22
9
Energy Conservation 
No energy accumulation within the cv, no work, no change PE
(
)
⎥
⎥
⎦
⎤
⎢
⎢
⎣
⎡
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛+
−
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛+
′′
=
′′
−
′′
−
Δ
+
Δ
+
x
x
x
x
x
x
x
x
v
h
v
h
m
Q
Q
2
2
2
2
&
&
&
(
)
⎥
⎥
⎦
⎤
⎢
⎢
⎣
⎡
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
+
+
−
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
+
+
′′
=
−
′′
−
′′
Δ
+
Δ
+
x
x
x
x
x
cv
x
x
x
gz
v
h
gz
v
h
A
m
W
A
Q
Q
2
2
2
2
&
&
&
&
⎟
⎠
⎞
⎜
⎝
⎛
+
′′
=
′′
−
dx
dv
v
dx
dh
m
dx
Q
d
x
x
x
&
&
ΔxÆ 0 differential eq. = Fourier’s law for conduction 
⎦
⎣
General vector form
(species are diffusing.)
17
∑
′′
+
∇
−
=
′′
i
diff
i
h
m
T
k
Q
,
&
&
diffusion
conduction
Heat flux
Energy Conservation 
For 1-D plan layer, heat flux
(
)
∑
−
+
−
=
′′
i
i
i
h
v
v
Y
dT
k
Q
ρ
&
∑
∑
∑
′′
−
′′
+
−
=
−
+
−
=
′′
h
m
h
m
dx
dT
k
h
Y
v
h
Y
v
dx
dT
k
Q
i
i
i
i
x
i
i
ix
x
&
&
&
ρ
ρ
The bulk and species mass flux
(
)
∑
+
i
x
ix
i
x
h
v
v
Y
dx
k
Q
ρ
Diffusion velocity
18
m’” i=ρvixYi, ρvx=m’”, Σyi hi = h


2010-10-22
10
∑
∑
∑
′′
−
′′
+
−
=
−
+
−
=
′′
h
m
h
m
dx
dT
k
h
Y
v
h
Y
v
dx
dT
k
Q
i
i
i
i
x
i
i
ix
x
&
&
&
ρ
ρ
⎟
⎠
⎞
⎜
⎝
⎛
+
′′
=
′′
−
dx
dv
v
dx
dh
m
dx
Q
d
x
x
x
&
&
미분
(
) ∑
∑
∑
′′
+
′′
=
′′
dx
m
d
h
dx
dh
m
m
h
dx
d
i
i
i
i
i
i
&
&
&
i
i
m
dx
m
d
′′′
=
′′
&
&
1-D energy conservation equation
(
)
0
=
′′
+
⎟
⎠
⎞
⎜
⎝
⎛−
+
′′
∑
dx
dv
v
m
dx
dT
k
dx
d
m
h
dx
d
x
x
i
i
&
&
1-D species continuity
19
∑
∑
′′′
−
=
′′
+
⎟
⎠
⎞
⎜
⎝
⎛−
+
′′
i
i
x
x
i
i
m
h
dx
dv
v
m
dx
dT
k
dx
d
dx
dh
m
&
&
&
gy
q
1-D species continuity
∑
′′
+
−
=
′′
i
diff
i
h
m
dT
k
Q
&
&
Shvab-Zeldovich Energy Equation 
Lewis number (Le = k/(ρCpD)=1.0
The heat flux for a reacting flow
∑
∑
′′′
−
=
′′
+
⎟
⎠
⎞
⎜
⎝
⎛−
+
′′
i
i
x
x
i
i
m
h
dx
dv
v
m
dx
dT
k
dx
d
dx
dh
m
&
&
&
Elimination of species mass fluxes(m’”i) 
∑
−
−
=
′′
i
i
x
h
dx
dY
D
dx
dT
k
Q
ρ
&
∑
−
−
=
′′
dx
dY
h
D
dx
dT
k
Q
i
i
x
ρ
&
∑
+
i
diff
i
x
h
m
dx
k
Q
,
Using the species flux and Fick’s law
p
(
)
and enthalpies(hi) by Le=1.0
Single diffusivity
20
∑
∑
∑
+
=
dx
dh
Y
dx
dY
h
dx
Y
h
d
i
i
i
i
i
i
The derivative of the product
∑
∑
+
−
−
=
′′
dx
dh
Y
D
dx
Y
h
d
D
dx
dT
k
Q
i
i
i
i
x
ρ
ρ
&


2010-10-22
11
∑
∑
+
−
−
=
′′
dx
dh
Y
D
dx
Y
h
d
D
dx
dT
k
Q
i
i
i
i
x
ρ
ρ
&
Shvab-Zeldovich Energy Equation 
Heat flux
h
h Y
∑
∑
=
=
dx
dT
c
dx
dT
c
Y
dx
dh
Y
p
i
p
i
i
i
,
dx
dT
Dc
dx
dh
D
dx
dT
k
Q
p
x
ρ
ρ
+
−
−
=
′′&
h=Σhi Yi
Heat flux
Cp=dh/dT
21
dx
dT
Dc
dx
dh
D
dx
dT
c
Q
p
p
x
ρ
ρ
ρα
+
−
−
=
′′&
Sensible enthalpy by diffusion
Absolute enthalpy by diffusion
Sensible enthalpy by conduction
α=k/ρCp
1
=
≡D
Le
α
Shvab-Zeldovich Energy Equation 
Lewis number
α= D
With
ti
h
t fl
i
i
l
dx
dh
D
Qx
ρ
−
=
′′&
⎞
⎛
With assumption, heat flux is simply, 
⎟
⎠
⎞
⎜
⎝
⎛
+
′′
=
′′
−
dx
dv
v
dx
dh
m
dx
Q
d
x
x
x
&
&
Energy equation
22
dx
dv
v
m
dx
dh
m
dx
dh
D
dx
d
x
x
′′
+
′′
=
⎟
⎠
⎞
⎜
⎝
⎛
&
&
ρ
∑
∫
+
=
T
T
p
i
f
i
ref
dT
c
h
Y
h
0
,
Employing the absolute(STD) enthalpy,


2010-10-22
12
∫
∫
⎥
⎤
⎢
⎡
dv
dT
c
d
dY
dT
c
d
dY
d
Shvab-Zeldovich Energy Equation 
dx
dv
v
m
dx
dh
m
dx
dh
D
dx
d
x
x
′′
+
′′
=
⎟
⎠
⎞
⎜
⎝
⎛
&
&
ρ
∑
∫
+
=
T
T
p
i
f
i
ref
dT
c
h
Y
h
0
,
∑
∫
∑
∫
′′
+
′′
+
′′
=
⎥
⎥
⎦
⎤
⎢
⎢
⎣
⎡
+
dx
dv
v
m
dx
dT
c
d
m
dx
dY
h
m
dx
dT
c
d
D
dx
dY
h
D
dx
d
x
x
p
i
i
f
p
i
i
f
&
&
&
0
,
0
,
ρ
ρ
⎥⎦
⎤
⎢⎣
⎡
⎟
⎠
⎞
⎜
⎝
⎛
−
′′
−
=
′′
+
⎥
⎥
⎦
⎤
⎢
⎢
⎣
⎡
−
′′
∑
∫
∫
dx
dY
D
Y
m
h
dx
d
dx
dv
v
m
dx
dT
c
d
D
dx
d
dx
dT
c
d
m
i
i
i
f
x
x
p
p
ρ
ρ
&
&
&
0
,
Right hand side
Rearranging
A
dY
d
′′′
⎤
⎡
′′
23
[
]
∑
∑
∑
′′′
−
=
′′
−
=
⎥⎦
⎤
⎢⎣
⎡
⎟
⎠
⎞
⎜
⎝
⎛
−
′′
−
m
h
m
h
dx
d
dx
dY
D
Y
m
h
dx
d
i
f
i
i
f
i
i
i
f
&
&
&
0
,
0
,
0
,
ρ
Right-hand-side
A
A
AB
A
m
dx
dY
D
Y
m
dx
d
′′′
=
⎥⎦
⎤
⎢⎣
⎡
−
′′
&
&
ρ
∑
∫
∫
′′′
−
=
′′
+
⎥
⎤
⎢
⎡
−
′′
x
p
p
m
h
dv
v
m
dT
c
d
D
d
dT
c
d
m
&
&
&
0
ρ
Final energy equation
Shvab-Zeldovich Energy Equation 
운동에너지항=0
∑
∫
∫
′′′
−
=
⎥
⎥
⎦
⎤
⎢
⎢
⎣
⎡
−
+
′′
i
i
f
p
p
m
h
dx
dT
c
d
D
dx
d
dx
dT
c
d
m
&
&
0
,
ρ
∑
−
=
+
⎥
⎥
⎦
⎢
⎢
⎣
−
i
i
f
x
m
h
dx
v
m
dx
D
dx
dx
m
,
ρ
Sensible enthalpy 
Sensible enthalpy 
Elimination of species mass fluxes(m’”i) 
and enthalpies(hi) by Le=1.0
24
py
production 
by chemical reaction
Sensible enthalpy 
transport 
by diffusion
py
transport 
by convection


2010-10-22
13
For axisymmetric system(2-D) with steady flow,
25
(
)
(
)
0
1
=
∂
∂
+
∂
∂
x
r
v
x
v
r
r
r
ρ
ρ
For axisymmetric system(2-D) with steady flow,
1. Continuity:
2. Radial momentum:
26


2010-10-22
14
For axisymmetric system(2-D) with steady flow,
3. Axial momentum:
4. Species:
27
p
For axisymmetric system(2-D) with steady flow,
5. Energy:
6. Equation of state:
28


2010-10-22
15
For axisymmetric system(2-D) with steady flow,
7. Boundary conditions:
Axis of symmetry (r=0):
Exit (zÆ∞):
29
For axisymmetric system(2-D) with steady flow,
7. Boundary conditions:
Outlet (z=0):
r≤rI
rI<r ≤Ro
30
Out zone (r=Ro)


2010-10-22
16
The axisymmetric Laminar diffusion flame
Comp.           Exp.      
Comp.           Exp.      
Comp.           Exp.      
Comp.           Exp.      
Conc.-CH4
Temp.-CH4
31
H2O
O2
Homework  Chapter 7
Review Question  3, 4
Problems 7.1
32


# 과목1_연소공학_전남대 차시21 (1103290)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/8.pdf · 강의노트 PDF → md 변환물

1
1
Chapter 8
Laminar Premixed Flames
Chonnam Nat. Univ.
School of Mechanical System Engineering
Prof. Byung-Chul Choi
2
Laminar Premixed Flames
: gas ranges and ovens, Bunsen burner etc. 
-1-D conservation equations
-Physical processes
-Essential characteristics
-Flammability limits and ignition and extinction


2
3
Laminar Premixed Flames
Physical Description
Definition
Flame : a self-sustaining propagation of a localized combustion 
zone at subsonic velocities.
Subsonic flame : 
Supersonic flame : 
4
Laminar Premixed Flames
Physical Description
Principal characteristics
Flame temperature profile
Flame speed SL
A
v
A
v
A
S
b
b
u
u
L
u
ρ
ρ
ρ
=
=
u: unburned gas
b: burned gas


3
5
Flame temperature profile
Hydrocarbon flames (color)
Blue : lean, fast-reaction zone, 
Blue-Green : rich, 
CO+O2ÆCO2+hv(chemiluminescene)
Bright Yellow to dull orange :
6
Laboratory Flames
Bunsen-burner           Laminar flame speed
α
sin
u
L
v
S =
SL :Laminar 
burning velocity
vu: unburned gas
speed 
vu


4
7
Laboratory Flames
1-D flat flames
- stable flat flame
8
D
c
k
D
Le
P
ρ
α =
≡
Simplified analysis
Assumptions
1. 1-D, constant-area, steady-flow
2. KE, PE, viscous shear work, thermal radiation are all neglected.
3. dp/dx=0, p=const.
4. The diffusion of heat (Fourier’s law) and mass(Fick’s law)
5. Lewis No. Le=1.0
6. Properties are unity
7. Fuel & O2, 
8. Stoichiometric or


5
9
(
)
0
=
dx
v
d
x
ρ
constant
=
=
′′
xv
m
ρ
&
Simplified analysis
Conservation laws
Mass conservation or
Species conservation
i
i
m
dx
m
d
′′′
=
′′
&
&
Application of Fick’s law
i
i
i
m
dx
dx
dY
D
Y
m
d
′′′
=
⎥⎦
⎤
⎢⎣
⎡
−
′′
&
&
ρ
10
Pr
1
1
1
m
v
m
v
m
Ox
F
′′′
+
=
′′′
−
=
′′′
−
&
&
&
products
kg
)1
(
oxidizer
kg
fuel
kg
1
+
→
+
v
v
i
i
i
m
dx
dx
dY
D
Y
m
d
′′′
=
⎥⎦
⎤
⎢⎣
⎡
−
′′
&
&
ρ
For each species:
Fuel
Oxidizer
F
f
F
m
dx
dx
dY
D
d
dx
dY
m
′′′
=
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
−
′′
&
&
ρ
F
Ox
Ox
m
v
dx
dx
dY
D
d
dx
dY
m
′′′
=
⎟
⎠
⎞
⎜
⎝
⎛
−
′′
&
&
ρ


6
11
(
)
F
m
v
dx
dx
dY
D
d
dx
dY
m
′′′
+
−
=
⎟
⎠
⎞
⎜
⎝
⎛
−
′′
&
&
1
Pr
Pr
ρ
(
)
∑
′′′
−
=
⎥⎦
⎤
⎢⎣
⎡
−
′′
i
o
i
f
P
P
m
h
dx
dT
Dc
dx
d
dx
dT
c
m
&
&
,
ρ
Products:
Energy conservation
Shvab-Zeldovich form
12
P
c
F
p
c
h
m
dx
dx
dT
k
d
c
dx
dT
m
Δ
′′′
−
=
⎟
⎠
⎞
⎜
⎝
⎛
−
′′
&
&
1
L
uS
m
ρ
=
′′&
products
kg
)1
(
oxidizer
kg
fuel
kg
1
+
→
+
v
v
(
)
[
]
F
o
f
F
o
Ox
f
F
o
i
f
i
o
i
f
m
v
h
m
v
h
m
h
m
h
′′′
+
−
′′′
+
′′′
−
=
′′′
−∑
&
&
&
&
1
Pr
,
,
,
,
∑
Δ
′′′
−
=
′′′
−
c
F
i
o
i
f
h
m
m
h
&
&
,
or
D
c
k
D
Le
P
ρ
α =
≡
Mass flux
Why ?


7
13
(
)
bT
x
T
=
+∞
→
[ ]
∫
∞
∞
−
=
=
=
=
′′′
Δ
−
=
⎥⎦
⎤
⎢⎣
⎡
−
′′
dx
m
c
h
dx
dT
c
k
T
m
F
P
c
dx
dT
dx
dT
P
T
T
T
T
b
u
&
&
0
/
0
/
(
)
∫
∞
∞
−
′′′
Δ
−
=
−
′′
dx
m
c
h
T
T
m
F
P
c
u
b
&
&
(
)
u
T
x
T
=
−∞
→
Solution
(
)
0
=
−∞
→
x
dx
dT
B.C. far upstream of the flame
B.C. far downstream of the flame
(
)
0
=
+∞
→
x
dx
dT
14
dT
T
T
dx
T
T
dx
dT
u
b
u
b
−
=
−
=
δ
δ
or
(
)∫
′′′
−
≡
′′′
b
u
T
T
F
u
b
F
dT
m
T
T
m
&
&
1
(
)
F
P
c
u
b
m
c
h
T
T
m
′′′
Δ
−
=
−
′′
&
&
δ
(
)
(
)∫
′′′
−
Δ
−
=
−
′′
b
u
T
T
F
u
b
P
c
u
b
dT
m
T
T
c
h
T
T
m
&
&
δ
The average reaction rate


8
15
2
u
b
T
T
T
+
=
δ
u
b
T
T
dx
dT
−
=
0
/
2
/
=
−
′′
P
c
k
m δ
&
and
A flame lies in the high-temp. region,
m’”’=0, in interval –∞<x<δ/2, x= δ/2
[ ]
∫
∞
∞
−
=
=
=
=
′′′
Δ
−
=
⎥⎦
⎤
⎢⎣
⎡
−
′′
dx
m
c
h
dx
dT
c
k
T
m
F
P
c
dx
dT
dx
dT
P
T
T
T
T
b
u
&
&
0
/
0
/
m’”{T - Tu} – k/cp(dT/dx) = 0
T
(
)
m
c
k
P
′′
=
&
/
2
δ
(
)
F
P
c
u
b
m
c
h
T
T
m
′′′
Δ
−
=
−
′′
&
&
δ
16
(
)
2
/
1
2
)
(
2
⎥⎦
⎤
⎢⎣
⎡
′′′
−
Δ
−
=
′′
F
u
b
c
P
m
T
T
h
c
k
m
&
&
(
)
2
/
1
1
2
⎥⎦
⎤
⎢⎣
⎡
′′′
+
−
=
u
F
L
m
v
S
ρ
α
&
L
uS
m
ρ
=
′′&
α=k/ρu Cp, Δhc=(ν+1)Cp(Tb-Tu)
Flame velocity
(
)
2
/
1
1
2
⎥⎦
⎤
⎢⎣
⎡
′′′
+
−
=
F
u
m
v
&
α
ρ
δ
Flame thickness
(
)
m
c
k
P
′′
=
&
/
2
δ


9
17
L
S
/
2α
δ =
(
)
2
/
1
1
2
⎥⎦
⎤
⎢⎣
⎡
′′′
+
−
=
F
u
m
v
&
α
ρ
δ
(
)
2
/
1
1
2
⎥⎦
⎤
⎢⎣
⎡
′′′
+
−
=
u
F
L
m
v
S
ρ
α
&
x
δ SL = [4α2/1]1/2
Solve example 8.2
18
Detailed analysis
Governing Equations
Continuity
Species conservation (                                )
Energy conservation (7.67)


10
19
Detailed analysis
Boundary conditions
for energy equation
Boundary conditions
for species conservation
20
Detailed analysis
CH4-air flame


11
21
1
75
.1
−
∝
P
T
α
(
)
b
u
A
n
n
b
u
u
F
T
R
E
P
T
T
m
/
exp
/
1
−
∝
′′′
−
−
ρ
&
Factors influencing flame velocity and thickness
(
)
2
/
1
1
2
⎥⎦
⎤
⎢⎣
⎡
′′′
+
−
=
u
F
L
m
v
S
ρ
α
&
(
)
2
/
1
1
2
⎥⎦
⎤
⎢⎣
⎡
′′′
+
−
=
F
u
m
v
&
α
ρ
δ
L
S
/
2α
δ =
Temperature and pressure
Thermal diffusivity
Production rate : ω’iMWi=m’ F”’
ω’i= 
kG =
22
(
)
(
) 2
/
2
2
/
5.0
875
.0
2
/
exp
−
−
−
∝
n
b
u
A
n
b
u
L
P
T
R
E
T
T
T
S
(
)
2
/
2
/
5.0
875
.0
2
/
exp
n
b
u
A
n
b
u
P
T
R
E
T
T
T
−
−
+
∝
δ
Factors influencing flame velocity and thickness
(
)
2
/
1
1
2
⎥⎦
⎤
⎢⎣
⎡
′′′
+
−
=
u
F
L
m
v
S
ρ
α
&
Temperature and pressure
(
)
2
/
1
1
2
⎥⎦
⎤
⎢⎣
⎡
′′′
+
−
=
F
u
m
v
&
α
ρ
δ
From Fig.8.14, SL (cm/s) = 43 P-0.5


12
23
(
)
(
) 2
/
2
2
/
5.0
875
.0
2
/
exp
−
−
−
∝
n
b
u
A
n
b
u
L
P
T
R
E
T
T
T
S
Factors influencing flame velocity and thickness
Temperature and pressure
From Fig.8.13,
From Fig.8.14,
(
)
(
)
[
]
5.0
atm
43
cm/s
−
=
P
SL
(
)
( )
[
]
2
4
K
10
71
.3
10
cm/s
u
L
T
S
−
⋅
+
=
24
Equivalence ratio
CH4-air laminar flame speed


13
25
Equivalence ratio
CH4-air laminar flame thickness
26
Fuel type
Flame speed


14
27
(
)
dil
ref
ref
u
u
ref
L
L
Y
P
P
T
T
S
S
1.2
1
,
,
−
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
=
β
γ
Flame speed correlation for selected fuels
(
)
(
) 2
/
2
2
/
5.0
875
.0
2
/
exp
−
−
−
∝
n
b
u
A
n
b
u
L
P
T
R
E
T
T
T
S
By Metghalchi experimental form
K
298
,
=
ref
u
T
atm
1
=
ref
P
(
)
2
2
,
M
M
ref
L
B
B
S
Φ
−
Φ
+
=
(
)1
8.0
18
.2
−
Φ
−
=
γ
[
]1
22
.0
16
.0
−
Φ
+
−
=
β
28
Flame speed correlation for selected fuels
Homework 8.3
(1)CH4, (2) CH3OH, (3) C3H8, (4)i-C8H18 (Table 8.3 ref.)
Equivalence ratio (Φ)= 0.7-1.5, 0.1 간격으로SL을구하여
Graph(Excel)를그려비교/고찰하시오?
(
)
2
2
,
M
M
ref
L
B
B
S
Φ
−
Φ
+
=
(
)
dil
ref
ref
u
u
ref
L
L
Y
P
P
T
T
S
S
1.2
1
,
,
−
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
=
β
γ
(
)1
8.0
18
.2
−
Φ
−
=
γ
[
]1
22
.0
16
.0
−
Φ
+
−
=
β


15
29
Quenching, Flammability and Ignition
Quenching by a cold wall
Quenching: 고체벽이화염으로부터열, 
Quenching distance : the critical diameter of a circular tube
where
Flame
Ignition
Flame
Ignition
Diameter d (mm)
Energy, E (J)
Emin
Min.-ignition energy
30
Ignition and Quenching criteria
Criterion I – Ignition occur if enough energy is added to the gas 
to heat a slab about as thick as a steadily propagating 
laminar flame to the adiabatic flame temp..
Criterion II – The rate of heat by chemical reactions  inside
= the rate of heat loss by thermal conduction 


16
31
Simplified Quenching Analysis
tot
cond
Q
V
Q
,
&
&
=
′′′
c
F h
m
Q
Δ′′′
−
=
′′′
&
&
Q’”’V
Q’cond
d
Q’cond
δ flame thickness
L
Quenching distance
Heat produced by reaction = Heat loss by conduction to wall
Volumetric heat-release rate
Flame slab    heat loss     wall
wall
at
gas
In
dx
dT
kA
Qcond
−
=
&
A = 2 δ L
both side
32
b
d
T
T
dx
dT
w
b
/
−
≡
(
)(
)
(
)
b
d
T
T
L
k
dL
h
m
w
b
c
F
/
2
−
=
Δ′′′
−
δ
δ
&
(
)
c
F
w
b
h
m
T
T
kb
d
Δ
′′′
−
−
=
&
2
2
L
S
b
d
/
2
α
=
tot
cond
Q
V
Q
,
&
&
=
′′′
Tw=Tu, Δhc=(ν+1)Cp(Tb-Tu)
(
)
2
/
1
1
2
⎥⎦
⎤
⎢⎣
⎡
′′′
+
−
=
F
u
m
v
&
α
ρ
δ
L
S
/
2α
δ =
δ
b
d =
Flame
Ignition


17
33
Flammability
A flame propagates within a range of mixture strength 
between the lower and upper limits of flammability. 
0.64
2.54(75%)
0.14(4.0%)
H2
1.8
4.08
0.48
CH3OH
-
4.25
0.51
C8H18
2.0
2.83(9.5a%)
0.51(2.1%)
C3H8
2.5
1.64(15.0%)
0.46(5.0%)
CH4
Quenching 
distance(φ=1
)
Upper limit(φ)
Lower limit(φ)
Fuel
34
Flammability
Heat loss
Flame thickness
Conduction and radiation loss
Conduction loss
:negative temp. gradient


18
35
cond
Q
V
Q
&
&
=
′′′
(
)
crit
u
b
R
R
T
T
dr
dT
crit
−
−
=
(
)
c
F
u
b
crit
h
m
T
T
k
R
Δ′′′
−
−
=
&
3
2
Ignition
Minimum ignition energy
Simplified Ignition Analysis
Criterion II – The rate of heat by chemical reactions  inside
= the rate of heat loss by thermal conduction 
crit
R
crit
crit
c
F
dr
dT
R
k
R
h
m
2
3
4
3
/
4
π
π
−
=
Δ′′′
−&
Boundary conditions
r=Rcrit ; T(Rcrit)= Tb
r=∞; T(∞) = Tu
36
L
crit
S
R
α
6
=
P
uc
k ρ
α
/
=
2
/
6δ
=
crit
R
(
)
2
/
1
1
2
⎥⎦
⎤
⎢⎣
⎡
′′′
+
−
=
u
F
L
m
v
S
ρ
α
&
(
)
c
F
u
b
crit
h
m
T
T
k
R
Δ′′′
−
−
=
&
3
2
L
S
/
2α
δ =
-Rcrit는
-Quenching distance d = √b δ


19
37
(
)
u
b
P
crit
ign
T
T
c
m
E
−
=
(
)(
)
3
/
6.
61
L
u
b
P
b
ign
S
T
T
c
E
α
ρ
−
=
Critical radius Æ minimum ignition energy
3
6.
61
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
−
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
=
L
b
u
b
b
P
ign
S
T
T
T
R
c
P
E
α
b
u
b
MW
R
R
/
=
38
Pressure and temp. dependencies
2
−
∝P
Eign
Effect of pressure on minimum spark-ignition energy


20
39
Flashback                                   
Liftoff
Flame Stabilization
Local flame speed>local flow velocity
Local flame speed<local flow velocity
40
Stability diagrams for flashback, and yellow-tipping
Fuel: Natural gas
(soot formation)


21
41
Stability diagrams for flashback, and yellow-tipping
(soot formation)
42
Homework  
Chapter 8
Problems  8.1, 8.9, 8.14


# 과목1_연소공학_전남대 차시21 (1103291)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/9.pdf · 강의노트 PDF → md 변환물

1
Chapter 9
Laminar Diffusion 
School of Mechanical Systems Engineering
Ch
N t U i
Flames
Chonnam Nat. Univ.
Prof. CHOI Byung-Chul
Objectives
1.Non-Reacting Laminar Jet
2.Jet Flame Physical Description
3.Flame length and parameter
(Burner shape, flow rate, fuel type)
4. Soot formation
4. Soot formation


2
Nonreacting Constant-density Laminar Jet
Physical Description
-Potential core : the effect of viscous shear and diffusion
-The jet edge : the velocity and fuel concentration decrease
Nonreacting Constant-density Laminar Jet
Physical Description
-the initial jet momentum is conserved.
-Momentum flow of the jet =
-Momentum flow of the jet  =
at any x, J                              from the nozzle, Je 
(
) (
)
∫
∞
=
0
2
2
2
,
,
2
R
v
rdr
x
r
v
x
r
e
e
x
π
ρ
ρ
π
ρe=the density of the fuel at the nozzle exit
ve=the velocity of the fuel at the nozzle exit
-the distribution of the fuel mass fraction 
is similar to the dimensionless velocity dist..
YF(r,x) = vx(r,x)/ve
(
) (
)
(
)
∫
∞
=
0
,
2
,
,
,
2
e
F
e
e
F
x
Y
R
v
rdr
x
r
Y
x
r
v
x
r
π
ρ
ρ
π


3
Assumptions
1. Pressure and temp. = const.
2. B
3. Sc= v/D(Schmidt No.)=(momentum diffusivity)/(mass diffusivity)=1.0
4. Only radial diffusion of momentum and species
(
)
0
1
=
∂
∂
+
∂
∂
r
r
v
r
x
v
r
x
⎟⎞
⎜⎛∂
∂
=
∂
+
∂
v
r
v
v
v
v
v
x
x
x
1
Conservation Laws
Mass conservation
Axial Momentum Conservation
⎟
⎠
⎜
⎝
∂
∂
∂
+
∂
r
r
r
r
v
r
v
x
v
r
x
Species Conservation
⎟
⎠
⎞
⎜
⎝
⎛
∂
∂
∂
∂
=
∂
∂
+
∂
∂
r
Y
r
r
r
D
r
Y
v
x
Y
v
F
F
r
F
x
1
F
Ox
Y
Y
−
=1
(
)
0
,
=
x
o
vr
(
)
0
0
∂vx
Boundary Conditions
Along the jet centerline (r=0)
vx/ve,
YF
1 0
(
)
0
,0
=
∂
∂
x
r
vx
(
)
0
,0
=
∂
∂
x
r
YF
(
)
0
,
=
∞x
vx
(r = ∞)
vx/ve,
YF
R           r
1.0
(
)
0
,
=
∞x
YF
r


4
(
)
e
x
v
R
r
v
=
≤
0,
(
)
0
0,
=
> R
r
vx
(
)
1
0,
, =
=
≤
e
F
F
Y
R
r
Y
At the jet exit ( x=0 )
vx/ve,
YF
1.0
(
)
,e
F
F
(
)
0
0,
=
> R
r
YF
2
2
4
1
8
3
−
⎥⎦
⎤
⎢⎣
⎡+
=
ξ
μ
π
x
J
v
e
x
0       R           r
Solution
The axial velocity
Th
di l
l
it
3
2
/
1
4
1
3
−
⎟⎟⎞
⎜⎜⎛
=
ξ
ξ
J
v
e
The radial velocity
2
2
4
1
16
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛+
⎟⎟
⎠
⎜⎜
⎝
=
ξ
πρ
x
v
e
r
Je : initial momentum flow 
ξ contains r/x
2
2 R
v
J
e
e
e
π
ρ
=
x
r
J e
e
μ
π
ρ
ξ
1
16
3
2
/
1
⎟
⎠
⎞
⎜
⎝
⎛
=
(
)(
) [
]
2
2
1
4
/
1
/
/
375
.0
/
−
−
+
=
ξ
μ
ρ
R
x
R
v
v
v
e
e
e
x
(
)(
)
1
0
/
/
375
.0
/
−
=
R
x
R
v
v
v
e
e
e
x
μ
ρ
The axial velocity distribution in dimensionless
The dimensionless centerline velocity decay (r=0, ξ =0)
(
)(
)
0
,
e
e
e
x
μ
ρ
Centerline velocity decay for laminar jet


5
1
2
/
1
Re
97
.2
97
.2
/
−
=
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
=
j
R
v
x
r
ρ
μ
μ
ρ
/
Re
R
ve
e
j ≡
(
)(
) [
]
2
2
1
4
/
1
/
/
375
.0
/
−
−
+
=
ξ
μ
ρ
R
x
R
v
v
v
e
e
e
x
(
)(
)
1
0
,
/
/
375
.0
/
−
=
R
x
R
v
v
v
e
e
e
x
μ
ρ
⎠
⎝
eR
v
ρ
(
)
x
r
/
tan
2
/
1
1
−
≡
α
Spreading angle
jet half-width
3 Q
The solution for the concentration
⎟
⎠
⎞
⎜
⎝
⎛
∂
∂
∂
∂
=
∂
∂
+
∂
∂
r
v
r
r
r
v
r
v
v
x
v
v
x
x
r
x
x
1
⎟
⎠
⎞
⎜
⎝
⎛
∂
∂
∂
∂
=
∂
∂
+
∂
∂
r
Y
r
r
r
D
r
Y
v
x
Y
v
F
F
r
F
x
1
Sc= v/D(Schmidt No.)=1.0,  (momentum diffusivity)=(
[
]
2
2 4
/
1
8
3
−
+
=
ξ
π
x
F
F
D
Q
Y
(
) [
]
2
2
1
4
/
1
/
Re
375
.0
−
−
+
=
ξ
R
x
Y
j
F
QF= veπR2, volumetric flowrate of fuel from the nozzle
Sc= 1.0,   v = D
For the centerline values
(
)
1
0,
/
Re
375
.0
−
=
R
x
Y
j
F
(
)
j
R
x
Re
375
.0
~
/
>
For the centerline values
Solve ex9.1, ex9.2


6
Jet Flame Physical Description
≡
surface
Flame
unity
equals
,
,
ratio
e
equivalenc
the
where
points
Locus
Φ
Fuel diffuses radially outward.
Oxidizer diffuses radially inward.
(
)
1
,0
=
=
=
Φ
f
L
x
r
Lf : flame length
Jet Flame Physical Description
-Vertical flame,
Hot gas Æ buoyant forces Æ acceleration of flow Æ
narrowing of the flame Æ fuel concentration gradient(dYf/dt)
Æenhancing diffusion   (
g
(
-Soot formation for HC fuel flame
Soot is formed on the fuel side of the reaction zone.


7
Jet Flame Physical Description
Flame length
∝initial volumetric flowrate QF
QF= veπR2
F
f
DY
Q
L
8
3
π
≈
[
]
2
2 4
/
1
8
3
−
+
=
ξ
π
x
F
F
D
Q
Y
for nonreacting flow
r = 0, flame length
stoic
F
DY ,
8π
Simplified Theoretical Descriptions
Burke and Schumann
Assumptions
1. Laminar flow, steady, axisymmetric
2. 3 speciesÆ fuel, products, oxidizer
3. At flame Phi=1.0
4. Binary diffusion(Fick’s law)
5. Le=a/D=(thermal. Diff./mass diff.) = 1.0
6. Neglet radiation
7. Only radial diffusion of momentum, thermal energy
y
,
gy
8. Vertically upward


8
⎞
⎛
∂
∂
∂
∂
1
1
1
(
)
(
)
0
1
=
∂
∂
+
∂
∂
x
v
r
v
r
r
x
r
ρ
ρ
Basic Conservation Equations
Mass conservation(7.7)
Axial momentum conservation (7.48)
(
)
(
)
0
1
1
1
=
⎟
⎠
⎞
⎜
⎝
⎛
∂
∂
∂
−
∂
∂
+
∂
∂
r
Y
D
r
r
r
Y
v
r
r
r
Y
v
r
x
r
i
i
r
i
x
ρ
ρ
ρ
Ox
F
Y
Y
Y
−
−
= 1
Pr
(
)
(
)
(
)g
r
v
r
r
r
v
v
r
r
r
v
v
r
x
r
x
r
x
x
x
ρ
ρ
μ
ρ
ρ
−
=
⎟
⎠
⎞
⎜
⎝
⎛
∂
∂
∂
∂
−
∂
∂
+
∂
∂
∞
1
1
1
Species conservation(7.20)
(
)
(
)
0
=
⎟
⎟
⎠
⎞
⎜
⎜
⎝
⎛
∂
∂
∂
∂
−
∂
∂
+
∂
∂
∫
∫
∫
r
dT
c
D
r
r
dT
c
v
r
r
dT
c
v
r
x
P
p
r
P
x
ρ
ρ
ρ
Energy conservation(Shavb-Zeldovich, 7.66)
Additional relations
T
R
PMW
u
mix
=
ρ
(
)
1
/
−
∑
=
i
i
mix
WM
Y
MW
Flame Lengths for Circular-port and Slot Burners
Roper’s Correlations
Burner types Æ circular, square, slot, curved slot
Fl
l
th
stoic
F
F
f
Y
Q
D
L
,
1
8
3
π
≈
(
)
f
I
m
Y
L
ref
ref
F
stoic
F
f
ρ
ρ
ρ
ρ
μ
π
/
1
1
8
3
,
∞
∞
≈
&
Flame length
Constant density solution
Variable-density solution
(
)
f
I
Y
Q
D
L
ref
F
stoic
F
F
ref
f
ρ
ρ
ρ
ρ
ρ
π
/
1
1
8
3
2
,
∞
∞⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
≈


9
(
)
(
)
67
.0
thy
,
/
1
1
ln
4
/
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
+
=
∞
∞
∞
f
F
F
f
T
T
S
D
T
T
Q
L
π
Circular port
S : the molar stoichiometric oxidizer-fuel ratio
(
)
(
)
S
T
T
Q
L
F
F
f
/
1
1
ln
/
1330
expt
,
+
=
∞
(
)
(
)
(
)
[
]
67
.0
2
5
0
thy
,
/
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
=
∞
∞
F
F
f
T
T
T
T
Q
L
S : the molar stoichiometric oxidizer fuel ratio
D∞ : mean diffusion coefficient 
Square port
(
)
(
)
[
]
2
5.0
y
,
1
inverf
16
⎟⎠
⎜⎝
+
−
∞
f
f
T
S
D
(
)
(
)
(
)
[
]
2
5.0
expt
,
1
inverf
/
1045
−
∞
+
=
S
T
T
Q
L
F
F
f
33
.0
2
,
2
thy
,
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
=
∞
∞
∞
T
T
T
T
Y
hID
Q
b
L
f
F
stoic
F
F
f
β
Slot-burner – Momentum controlled
2
,
2
4
expt
,
10
6.8
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
⋅
=
∞
F
stoic
F
F
f
T
T
hIY
Q
b
L
β
(
)
[
]
S
+
=
1
/
1
inverf
4
1
β
e
F
act
e
v
m
J
I
&
,
=


10
Flowrate and Geometry Effects
-circular port burner : 
exit velocity  ∝Lf
-Slot-burner port :
more narrow port, 
shorter flame length
h
b
Predicted Flame Lengths for Circular and Slot-burners
Factors Affecting Stoichiometry
S
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
=
fluid
nozzle
moles
fluid
ambient
moles
The molar stoichiometric ratio
stoic
⎠
⎝
fluid
nozzle
moles
Fuel type
At circular-port, same flowrate
•Flame length increases 
as the H/C ratio decreases.
Dependence of Flame Length on fuel stoichiometry


11
Factors Affecting Stoichiometry
Primary Aeration(
At 40-60% primary aeration of Stoichi.
-Suppression formation of soot
-Blue flame
pure
pri
pri
S
S
1
1
+
−
=
ψ
ψ
-Shorter flame length 
Effect of primary aeration on laminar jet flame lengths
Oxygen Content of Oxidizer
Effect of O2 content in the oxidizing stream on flame length


12
Soot Formation & Destruction
Processes
1. Formation of precursor species
PAH : polycyclic aromatic HC
2. Particle inception
2. Particle inception
3. Surface growth and particle 
agglomeration
4. Particle oxidation
Æ near
Æ
Radial profiles of temp. and scattered light for a lamina ethylene jet diffusion flame
Smoke point : a fuel’s tendency to soot
Smoke point :
C3H8 = 7.87
C4H10 = 7.00
n-C7H16=5.13
i-C8H18=1.57
Smoke point order:
Alkanes(paraffins) 1.57-7.87>
alkenes(olefins) 1 12 3 84>
alkenes(olefins) 1.12-3.84>
Alkynes(acethylenes) 0.51-0.8> 
aromatics 0.22-0.28


13
Countflow Flames
-A one dimensional character
F
d
l
d
di
-Fundamental understanding 
of the diffusion flame
Countflow Flames
Mathematical Description
Continuity (7.7)
(
)
(
)
0
1
=
∂
∂
+
∂
∂
x
r
v
v
r
ρ
ρ
(
)
(
)
∂
∂
x
r
x
r
r
ρ
ρ
Axial momentum conservation (7.43)
Radial momentum conservation (7.44)
(
)
(
)
(
)
r
g
x
P
r
x
r
r
r
v
v
r
r
v
v
r
x
x
xx
rx
r
x
x
x
ρ
τ
τ
ρ
ρ
+
∂
∂
−
∂
∂
+
∂
∂
=
∂
∂
+
∂
∂
(
)
(
)
(
)
r
P
r
x
r
r
r
v
v
r
r
v
v
r
x
rx
rr
r
r
x
r
∂
∂
−
∂
∂
+
∂
∂
=
∂
∂
+
∂
∂
τ
τ
ρ
ρ
Stream function is employed:
Stream function is employed:


14
Countflow Flames
Ignore buoyancy
Left-hand-sides
∂P/∂x and (1/r)(∂P/∂r) are functions of x only.
Countflow Flames
The radial-pressure-gradient eigenvalue
The pressure = uniform
Energy and species conservation equations


15
Countflow Flames
Boundary Conditions
Countflow Flames
Equivalence ratio, temp. and velocity profiles 
through CH4-air countflow diffusion flame
By CHEMKIN
y C


16
Countflow Flames
Major species mole-fraction profiles 
through CH4-air countflow diffusion flame
Homework
Chapter 9
Chapter 9
Review Questions 5, 8
Problems 9.5, 9.9, 9.13, 9.14


# 과목1_연소공학_전남대 차시21 (1103292)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/10.pdf · 강의노트 PDF → md 변환물

1
Chapter 10
Droplet Evaporation and 
Burning
School of Mechanical Systems Engineering
Chonnam Nat. Univ.
Prof. Byung-Chul Choi
Some Applications
-Diesel Engine
-Gas-Turbine Engine
Liquid Rocket Engines
-Liquid-Rocket Engines


2
Simple model of Droplet Evaporation
Impinging water jets form
Simple model of Droplet Evaporation
Assumptions
1. The droplet evaporates a quiesent, infinite medium.
2. Quasi-steady
3. A single-component liquid fuel
4. Uniform temp.
5. Binary diffusion
6. Thermophysical properties = ?


3
constant
4
2 =
=
=
r
v
m
m
r
F
π
ρ
&
&
(
)
2
d
Gas-Phase Analysis
Mass conservation
(
)
0
2
=
dr
r
v
d
r
ρ
d
dT
k
c
m
d
dr
dT
r
d
pg
4
2
&
=
⎟
⎠
⎞
⎜
⎝
⎛
vr: bulk flow velocity
Gas-phase
Energy conservation (from 7.65)
Le = 1.0
dr
k
dr
π
4
dr
dT
m
Z
dr
dr
dT
r
d
&
=
⎟
⎠
⎞
⎜
⎝
⎛
2
p
Z=Cpg/4πk
(
)
∞
=
∞
→
T
r
T
:
1
condition
boundary
Gas-Phase Analysis
(
)
boil
:
2
condition
boundary
T
r
r
T
s =
=
⎞
⎛
1
2
C
T
m
Z
dr
dT
r
+
=
&
(
)
1
1
dr
dT
m
Z
dr
dr
dT
r
d
&
=
⎟
⎠
⎞
⎜
⎝
⎛
2
Integration 
(
)
2
1
1
ln
1
C
r
C
T
m
Z
m
Z
+
−
=
+
&
&
(
)
1
2
ln
1
C
T
m
Z
m
Z
C
+
=
∞
&
&
B.C. T=T∞


4
(
)
[
]
(
)
s
boil
s
r
m
Z
T
r
m
Z
T
m
Z
C
/
exp
1
/
1
&
&
&
−
−
−
−
=
∞
From B.C. T(r=rs)=Tboil.
(
)
(
)⎥⎦
⎤
⎢⎣
⎡
−
−
−
=
∞
s
boil
r
m
Z
T
T
m
Z
m
Z
C
/
exp
1
ln
1
2
&
&
&
(
)
(
)
(
) T
Z
T
Z
T
T
/
/
&
&
+
Final general solution
( )
(
)
(
)
(
)
(
)
s
boil
s
boil
r
m
Z
T
r
m
Z
T
r
m
Z
T
T
r
T
/
exp
1
/
exp
/
exp
&
−
−
+
−
−
−
−
=
∞
∞
(
)
fg
liq
vap
cond
h
m
h
h
m
Q
&
&
&
=
−
=
dT
2
Droplet-Gas-Phase Interface Energy balance
Fourier’s law for Q’cond
fg
s
g
h
m
dr
dT
r
k
sr
&
=
2
4π
( )
(
)
(
)
(
)
(
)
s
boil
s
boil
r
m
Z
T
r
m
Z
T
r
m
Z
T
T
r
T
/
exp
1
/
exp
/
exp
&
&
&
−
−
+
−
−
−
−
=
∞
∞
Differentiating, the temp gradient in the gas phase 
at the droplet surface
(
)
(
)⎤
⎡
−
−
b il
r
m
Z
T
T
m
Z
dT
/
exp
&
& (
)
(
)
(
)
⎥⎦
⎤
⎢⎣
⎡
−
−
=
∞
s
s
boil
s
r
m
Z
r
m
Z
T
T
r
m
Z
dr
dT
sr
/
exp
1
/
exp
2
&


5
(
)
⎥
⎤
⎢
⎡
+
−
=
∞
1
ln
4
boil
pg
s
g
T
T
c
r
k
m
π
&
fg
s
g
h
m
dr
dT
r
k
sr
&
=
2
4π
(
)
(
)
(
)
⎥⎦
⎤
⎢⎣
⎡
−
−
−
−
=
∞
s
s
boil
s
r
m
Z
r
m
Z
T
T
r
m
Z
dr
dT
sr
/
exp
1
/
exp
2
&
&
&
⎥
⎥
⎦
⎢
⎢
⎣
+
=
1
ln
fg
pg
h
c
m
(
)
fg
boil
pg
q
h
T
T
c
B
−
=
∞
From literature, Bq, Spalding No. or transfer No.
So,
(
)1
ln
4
+
=
q
pg
s
g
B
c
r
k
m
π
&
m
dt
dmd
&
−
=
Droplet Lifetime (Chapt. 3)
Mass-transfer
D
l t
D
V
(
)1
ln
4
+
−
=
q
g
B
D
c
k
dt
dD
ρ
6
/
3
D
V
md
π
ρ
ρ
l
l
=
=
Droplet mass, md
V
(
)1
ln
4
+
=
q
pg
s
g
B
c
r
k
m
π
&
pgD
c
dt
l
ρ
(
)1
ln
8
2
+
−
=
q
pg
g
B
c
k
dt
dD
l
ρ
(
)1
ln
8
+
=
q
pg
g
B
c
k
K
l
ρ


6
∫
∫
−
=
2
2
0
0
2
ˆ
ˆ
D
D
t
t
Kd
D
d
( )
Kt
D
t
D
−
=
2
0
2( )
0
K
D
td
/
2
0
=
D2 law
(
)1
ln
8
+
=
q
g
B
c
k
K
l
ρ
Slop=-
Do
2
D2
pg
c
l
ρ
td
Time
Simple model of Droplet Burning
Assumptions
1. The droplet evaporates a quiesent, infinite medium.
2
Q
i
t
d
2. Quasi-steady
3. A single-component liquid fuel
4. Uniform temp.
5. The gas-phase, fuel vapor, oxidizer, products 
6. Fuel and O2 react in stoichi.
7. Le = α/D = 1.0
8. Neglect radiation heat transfer
9. Thermophysical properties = ?
10.No soot and liquid water


7
( )
constant
=
=
F
m
r
m
&
&
Mass conservation
Species conservation
I
R
i
(
l
Fi k
l
)
(
)
A
AB
B
A
A
A
Y
D
m
m
Y
m
∇
−
′′
+
′′
=
′′
ρ
&
&
&
Inner Region (apply Fick’s law)
2
4
/
r
m
m
m
F
F
A
π
&
&
&
=
′′
≡
′′
0
′′
′′
&
&
A: fuel, B; ?
0
Pr =
′′
≡
′′
m
mB
dr
dY
Y
D
r
m
F
F
F
−
−
=
1
4
2 ρ
π
&
Spherical coordinate, r-direction
Two B.C.
t d
l t
f
li
id
ilib i
( )
( )
s
s
F
s
F
T
Y
r
Y
,
=
( )
0
=
f
F r
Y
at flame
Solution as an eigenvalue
at droplet surface, liquid-vapor equilibrium
( )
(
)
ZF= 1/(4πρD)
( )
( )
s
s
F
s
F
T
Y
r
Y
,
=
(     )
( )
(
)
r
m
Z
C
r
Y
F
F
F
/
exp
1
1
&
−
+
=


8
( )
(
)
(
)
(
)
s
F
F
F
F
s
F
F
r
m
Z
r
m
Z
Y
r
Y
/
exp
/
exp
1
1
,
&
&
−
−
−
−
=
Solution
Applying droplet surface condition
= 0
(
)
(
)
f
F
F
s
F
F
s
F
r
m
Z
r
m
Z
Y
/
exp
/
exp
1
,
&
&
−
−
−
=
pp y
g
p
( )
0
=
f
F r
Y
(              )
( )
( )r
Y
r
Y
F
−
=1
Pr
The combustion product mass fraction
′′
′′
′′
&
&
&
products
kg
)1
(
oxidizer
kg
fuel
kg
1
+
=
+
v
v
Outer Region
F
Ox
A
m
v
m
m
′′
−
=
′′
≡
′′
(
)
F
B
m
v
m
m
′′
+
+
=
′′
≡
′′
&
&
&
1
Pr
dr
dY
Y
v
D
r
m
Ox
Ox
F
+
+
=
ρ
π
2
4
&
Fick’s law in the outer region
Ox
( )
0
=
f
Ox r
Y
B.C.
(
)
1
,
≡
=
∞
→
∞
Ox
Ox
Y
r
Y


9
( )
(
)
r
m
Z
C
v
r
Y
/
exp
&
+
=
Outer Region
dr
dY
Y
v
D
r
m
Ox
Ox
F
+
+
=
ρ
π
2
4
&
Integrating
Flame sheet
m’F
m’ox=vm’F
( )
(
)
r
m
Z
C
v
r
Y
F
F
Ox
/
exp
1
−
+
−
=
m’pr=(1+v)m’F
( )
0
=
f
Ox r
Y
From B.C. Æ C1
( )
(
)
(
)
⎥
⎥
⎦
⎤
⎢
⎢
⎣
⎡
−
−
−
=
1
/
exp
/
exp
f
F
F
F
F
Ox
r
m
Z
r
m
Z
v
r
Y
&
&
(
)
(
)
1
,
≡
=
∞
→
∞
Ox
Ox
Y
r
Y
(
)
(
) v
v
r
m
Z
f
F
F
/
1
/
exp
+
=
+
&
( )
( )
r
Y
r
Y
Ox
−
= 1
Pr
The product mass fraction distribution
dT
c
m
d
dT
r
d
2
&
⎟⎠
⎞
⎜⎝
⎛
Energy conservation
Shvab-Zeldovich form
dr
dT
k
c
m
dr
dr
dT
r
d
pg
π
4
2
&
=
⎟
⎠
⎞
⎜
⎝
⎛
From7.65 & 10.3
dr
dT
k
c
m
dr
dr
g
pg
F
π
4
=
⎟⎠
⎜⎝
dT
m
Z
dr
dT
r
d
&
=
⎟⎠
⎞
⎜⎝
⎛
2
ZF = Cpg/(4πkg)
Le=1.0
ZF= 1/(4πρD) from species cons.
ZF= ZT
dr
m
Z
dr
F
T
B.C.
( )
( )
⎩
⎨
⎧
=
=
f
f
s
s
T
r
T
T
r
T
region
Inner
( )
(
)
⎩
⎨
⎧
=
∞
→
=
∞
T
r
T
T
r
T
f
f
region
Outer


10
( )
(
)
1
/
exp
C
r
m
Z
C
F
T
−
&
dr
dT
m
Z
dr
dr
dT
r
d
F
T &
=
⎟⎠
⎞
⎜⎝
⎛
2
General solution
Temperature distributions
( )
(
)
2
1
/
exp
C
m
Z
r
m
Z
C
r
T
F
T
F
T
+
=
&
( )
( )
⎩
⎨
⎧
=
=
f
f
s
s
T
r
T
T
r
T
region
Inner
In the inner zone ( rs<r<rf )
( )
(
)
(
)
(
)
(
)
(
)
(
)
f
F
T
s
F
T
f
F
T
s
s
F
T
f
F
T
f
s
r
m
Z
r
m
Z
r
m
Z
T
r
m
Z
T
r
m
Z
T
T
r
T
/
exp
/
exp
/
exp
/
exp
/
exp
&
&
&
&
&
−
−
−
−
−
−
+
−
−
=
( )
(
)
⎩
⎨
⎧
=
∞
→
=
∞
T
r
T
T
r
T
f
f
region
Outer
In the outer region ( rf<r< ∞ )
( )
(
)
(
)
(
)
(
) 1
/
exp
/
exp
/
exp
−
−
−
−
+
−
−
=
∞
∞
f
F
T
f
f
F
T
F
T
f
r
m
Z
T
T
r
m
Z
r
m
Z
T
T
r
T
&
&
&
(
)
l
&
&
&
−
−
+
−
=
i
F
i
g
Q
h
h
m
Q
liq
vap
Energy Balance at Droplet Surface
At liquid-vapor interface
(
)
g
q
p
l
&
&
&
−
−
+
=
i
fg
F
i
g
Q
h
m
Q
(
)
0T
T
c
m
Q
s
P
F
i
−
=
−
l
l
&
&
Liquid-vapor interface
or
The heat conducted into the droplet interior
T
i iti l t
T
f
t
F
i
i
m
Q
q
&
&
l
l
/
−
−≡
Flame sheet
To: initial temp., Ts: surface temp.
Onion skin model
The energy required to heat up from To to Ts


11
(
)
0T
T
c
q
s
P
i
−
=
−
l
l
dT
Onion skin model
Temp.=const., for the lumped parameter,
dt
dT
c
m
Q
s
P
d
i
l
l
&
=
−
dt
dT
m
c
m
q
s
F
P
d
i
&
l
l =
−
md: droplet mass
dTs/dt :?
Negligible thermal inertia
0
=
−l
iq
(
)
l
&
−
+
=
⎥⎦
⎤
⎢⎣
⎡−
−
i
fg
F
r
g
q
h
m
dr
dT
r
k
s
2
4π
From (10.45b) & (10.43), dTs/dt=?
Where
(
)
(
)
(
)
(
)
[
]
f
F
T
s
F
T
F
T
F
T
f
s
r
m
Z
r
m
Z
r
r
m
Z
m
Z
T
T
dr
dT
/
exp
/
exp
/
exp
2
&
&
&
&
−
−
−
−
−
=
(
)
(
)
0
1
/
exp
+
−
−
s
F
T
s
f
pg
r
m
Z
T
T
c
&
Where,
For rs<r<rf
(
)
(
)
(
)
(
)
(
)
[
]
0
1
/
exp
/
exp
p
=
+
−
−
−
+
−
f
F
T
s
F
T
s
F
T
fg
i
f
pg
r
m
Z
r
m
Z
h
q
&
&
l
Unknowns : (                               )


12
Energy balance at flame sheet
∞
−
−+
=
−
+
f
i
f
Ox
Ox
F
F
Q
Q
h
m
h
m
h
m
&
&
&
&
&
Pr
Pr
A surface energy balance at the flame sheet
(
)
ref
,
T
T
c
h
h
pg
o
F
f
F
−
+
≡
(
)
ref
,
T
T
c
h
h
pg
o
Ox
f
Ox
−
+
≡
(
)
T
T
c
h
h
o
−
+
≡
The enthalpies
(
)
ref
Pr
,
Pr
T
T
c
h
h
pg
f
+
≡
(
)
( )
( )
(
)
o
f
o
Ox
f
o
F
f
ref
c
h
v
h
v
h
T
h
Pr
,
,
,
1
1
+
−
+
=
Δ
The heat of combustion/mass of fuel
(
)
[
]
∞
−
−+
=
+
−
+
f
i
f
Ox
F
F
Q
Q
h
v
vh
h
m
&
&
&
)
1
Pr
(
)
(
) (
)(
)
[
]
+
=
−
+
−
−
+
−
+
Δ
f
f
f
f
f
Q
Q
T
T
v
T
T
v
T
T
c
m
h
m
&
&
&
&
f
f
f
1
(
)
(
) (
)(
)
[
]
∞
−
−+
=
+
+
+
Δ
f
i
f
f
f
f
pg
F
c
F
Q
Q
T
T
v
T
T
v
T
T
c
m
h
m
ref
ref
ref
1
d
t d
i
t
t d
i
heat
which
at
Rate
chemical
which
at
Rate
∞
−
−+
=
Δ
f
i
f
c
F
Q
Q
h
m
&
&
&
Cpg=const., Δhc : independence of temp.
flame
the
from
flame
the
at
energy
thermal
away
conducted
is
to
converted
is
energy


13
+
−−
=
Δ
fr
fr
dr
dT
r
k
dr
dT
r
k
h
m
f
g
f
g
c
F
2
2
4
4
π
π
&
Fourier’s law and temp. distibution
(
)
(
)
(
)
[
]
f
F
T
F
T
f
F
T
r
m
Z
r
r
m
Z
T
T
m
Z
dr
dT
/
exp
1
/
exp
2
&
&
&
−
−
−
−
=
∞
(
)
(
)
(
)
(
)
/
exp
/
exp
⎤
⎡
r
m
Z
T
T
r
m
Z
T
T
c
&
&
The temp. gradient at r=rf
Flame sheet energy balance
(
)
(
)
(
)
(
)
(
)
(
)
(
)
[
]
0
1
/
exp
1
/
exp
/
exp
/
exp
/
exp
=
−
⎥
⎥
⎦
⎤
⎢
⎢
⎣
⎡
−
−
−
−
−
−
−
−
−
−
Δ
∞
f
F
T
f
F
T
f
f
F
T
s
F
T
f
F
T
f
s
c
pg
r
m
Z
r
m
Z
T
T
r
m
Z
r
m
Z
r
m
Z
T
T
h
c
&
&
&
Unknowns : (                                    )
(
)
T
B
A
P
/
exp
−
=
Liquid-Vapor equilibrium
Applying the Clausius-Clapeyron equation
Partial ?
/P
P
x
F,s
s
F
=
,
(
)
Pr
,
,
,
,
1
MW
x
MW
x
MW
x
Y
s
F
F
s
F
F
s
F
s
F
−
+
=
(
)
s
s
F
T
B
A
P
/
exp
,
=
a t a
Fuel mass and mole fraction:
(
)
(
)
(
)
[
]
Pr
,
/
exp
/
exp
/
exp
MW
T
B
A
P
MW
T
B
A
MW
T
B
A
Y
s
F
s
F
s
s
F
−
−
+
−
−
=


14
(
)
g
B
k
K
1
ln
8
+
=
Burning Rate Constant and Droplet Lifetimes
Burning rate constant, K
(
)
q
o
pg
B
c
K
,
1
ln +
=
l
ρ
( )
Kt
D
t
D
−
=
2
0
2
D2 law
Droplet lifetime  D2 (td)=0,
K
D
td
/
2
0
=
( )
( )
T
k
T
k
k
6
0
4
0
+
=
( )
T
c
c
pF
pg =
Evaporation problem, by Law and Williams
( )
( )
T
k
T
k
k
Ox
F
g
6.0
4.0
+
=
( )
sT
l
l
ρ
ρ =
(
)
f
s
T
T
T
+
=
5.0


15
Burning droplets illustrating D2 law behavior 
after initial transient
Homework 
Chapter 10
p
Ex. 10.1, 10.2, 10.3, 10.4
Problem
10.2, 10.4


# 과목1_연소공학_전남대 차시21 (1103293)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/11.pdf · 강의노트 PDF → md 변환물

1
Chapter 11
Introduction 
to Turbulent Flows
1
School of Mechanical Systems Engineering
Chonnam Nat. Univ.
Prof. Byung-Chul Choi
Objectives
-Review the turbulent flow
* Velocity
 Velocity
* Scalars (temp. and species)
* some physical notations
* definition of length scales
-Simple mathematical description
The features of free turbulent jets
2
-The features of free turbulent jets
* nonreacting, incompressible flows


2
Definition of Turbulence
Reynolds number:
A time-average of the flow property
μ
ρ
/
Re
R
ve
e
j ≡
( )
∫
Δ
≡
2
1
t
ti
dt
t
p
t
P
( )
( )t
P
P
t
P
′
+
=
g
p
p
y
ΔT=t2 - t1
P : any flow property(v, t, p etc.)
3
( )
( )
( )
( )t
T
T
t
T
′
+
=
( )
( )t
t
ρ
ρ
ρ
′
+
=
( )t
Y
Y
Y
i
i
i
′
+
=
Velocity as a function of time at
A fixed point in a turbulent flow
point
Reynolds decomposition =
2
rms
P
P
′
≡
′
The intensity of the turbulent fluctuations
Æ root-mean-square(rms)
P
P
/
rms′
The relative intensity
(%)
What is the physical nature 
of a turbulent flow ?
4
Eddy - macroscopic fluid element
Vortex (와동)
Vorticities(와동성) –


3
Length Scales in Turbulent Flows
4 Length Scales
L : Width of flow or macroscale
L : Width of flow or macroscale
lo : Integral scale or turbulence macroscale
lλ: Taylor microscale
lK : Kolmogorov microscale
(1) Width of flow or macroscale
5
( )
: L, largest length scale
Length Scales in Turbulent Flows
(2) Integral scale or turbulence macroscale
: lo the mean size of the large eddies in a turbulent flow
( )
∫
∞
=
0
0
dr
r
Rx
l
( )
( ) ( )
( )
( )r
v
v
r
v
v
r
R
rms
x
rms
x
x
x
x
,
,
0
0
′
′
′
′
≡
(3) Taylor microscale
6
( )
y
: lo 와lK 사이의scale, related to the mean rate of strain 
2
/
1
2
,
⎥
⎥
⎦
⎤
⎢
⎢
⎣
⎡
⎟⎠
⎞
⎜⎝
⎛
∂
∂
′
=
x
v
v
x
rms
x
λ
l


4
Length Scales in Turbulent Flows
(4) Kolmogorov microscale
(
)
4
/
1
0
3 / ∈
≈ν
K
l
: the smallest length scale
related to the rate of dissipation(            , ε)   
(
)
v
ke
′
2
/
3
2
δ
υ : molecular kinematic viscosity
7
(
)
rms
rms
v
v
t
ke
′
≈
≡
/
2
/
3
0
turb
0
l
δ
δ
ε
ν/
0
0
l
l
rms
v
Re
′
≡
Turbulence Reynolds Numbers
v’rms: root-mean-square 
fluctuating velocity 
ν
λ
λ
/
l
l
rms
v
Re
′
≡
ν/
K
rms
v
Re
K
l
l
′
≡
4
/
3
/l
l
Re
g
y
lo : Integral scale 
lλ: Taylor microscale
lK : Kolmogorov microscale
The largest(the integral)/the smallest(the Kolmogorov) scales
8
0
0
/
l
l
l
Re
K =
2
/
1
0
0
/
l
l
l
Re
=
λ
The largest(the integral) scale/ the Taylor microscale


5
Turbulent jets
Low Reynolds No.
9
High Reynolds No.
0
=
∂
+
∂
+
∂
v
v
v
z
y
x
Analyzing Turbulent Flows
Mass conservation
0
=
∂
+
∂
+
∂
z
y
x
x
z
x
y
x
x
x
v
v
z
v
v
y
v
v
x
v
t
ρ
ρ
ρ
ρ
∂
∂
+
∂
∂
+
∂
∂
+
∂
∂
x-direction Momentum conservation
(Navier-Stokes equations)
10
x
z
y
x
g
x
P
z
v
y
v
x
v
ρ
μ
+
∂
∂
−
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
∂
∂
+
∂
∂
+
∂
∂
=
2
2
2
2
2
2
Additional 2 components of momentum, 
energy and species conservation Æ solve vx, vy, vz, T, Yi


6
Axisymmetric Turbulent Jet
Axial momentum equation
⎟⎞
⎜⎛
∂
∂
∂
∂
v
v
v
x
x
x
1
Mass conservation
⎟
⎠
⎞
⎜
⎝
⎛
∂
∂
=
∂
+
∂
r
r
r
r
r
v
x
v
x
x
r
x
x
ε
(
)
(
)
0
=
∂
∂
+
∂
∂
r
r
v
x
r
v
r
x
11
B.C. (9.7a,b,d)
(
)
0
,
=
x
o
vr
(
)
0
,0
=
∂
∂
x
r
vx
(
)
0
,
=
∞x
vx
vx/ve,
YF
R           r
1.0
vx/ve,
YF
r
( )
( )
x
v
x
x max
,
%
99
0102
.0
δ
ε =
The eddy viscosity
The half width(r
) of the jet
1
2
/
1
x
r
∝
The half-width(r1/2) of the jet 
when vx has 
δ99%=2.5 r1/2
1
0
,
−
∝x
vx
12
( )
( )
constant
0256
.0
0
,
2
/
1
=
=
x
v
x
r
x
ε


7
2
2
4
1
8
3
−
⎥⎦
⎤
⎢⎣
⎡+
=
ξ
ρε
π
x
J
v
e
x
Mean velocity components,
⎦
⎣
ρ
2
2
3
4
1
4
1
16
3
⎥⎦
⎤
⎢⎣
⎡+
−
⎥⎦
⎤
⎢⎣
⎡
=
ξ
ξ
ξ
πρ
x
J
v
e
e
r
(
)(
) [
]
2
2
1
−
13
(
)(
) [
]
2
2
1
4
/
1
/
/
375
.0
/
−
+
=
ξ
ε
R
x
R
v
v
v
e
e
x
r=0, (ξ=0)
( )
(
)(
)
1
0
,
/
/
375
.0
/
−
=
R
x
R
v
v
x
v
e
e
x
ε
1
2
/
1
97
.2
−
⎟
⎠
⎞
⎜
⎝
⎛
=
x
R
v
r
e
ε
Finally,
⎠
⎝
(
)
1
0
,
/
15
.
13
/
−
=
R
x
v
v
e
x
The jet velocity decay :
The jet spreading rate :
08468
.0
/
2
/
1
=
x
r
Th
dd
i
it
14
R
ve
0285
.0
=
ε
The eddy viscosity :


8
Beyond the Simplest Model
Two-equation models : for turbulence
K e model :
K-e model : 
the turbulence kinetic energy dissipation rate
Direct numerical simulation (DNS)
Large-eddy simulation (LES) 
15
g
y
(
)
= DNS + statistical turbulence modeling method
Homework 
Chapter 11
난류(turbulence)의물리적성질에
대하여논하라. (A4 4 pages)
16


# 과목1_연소공학_전남대 차시21 (1103294)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/12.pdf · 강의노트 PDF → md 변환물

1
Chapter 12
Turbulent Premixed 
Flames
School of Mechanical Systems Engineering
Chonnam Nat. Univ.
Prof. Byung-Chul Choi
Turbulent Premixed Flames
Some Applications
Spark Ignition Engines
-Spark-Ignition Engines
-Gas-Turbine Engines
-Industrial Gas Burners


2
Definition of Turbulent Flame Speed
Laminar flame speed : depend on the thermal 
and chemical properties of the mixture
t
A
m
S
ρ
&
=
p
p
Turbulent flame speed : mixture properties + the flow
h=40mm
13.5o
L
v
u
Aρ
Sin 13.5/2 = (h/2)/L Æ L
A- = 2 x width(h) x length(L)
m’= ρu A v
ρu =P/(RT)
A- = 시간평균화염면적
Structure of Turbulent Premixed Flames
Superposition of instantaneous
reaction fronts obtained at
different times
Turbulent flame brush
Laminar flamelets


3
Structure of Turbulent Premixed Flames
Turbulent flame in a SI engine
Structure of Turbulent Premixed Flames
Three Flame Regimes
- Regime Criteria
δ : flame thickness
K
L
l
≤
δ
:
flames
laminar
Wrinkled
l
l
δ
ddi
i
Fl
l
δL : flame thickness
lK : Kolomogorov microscale
lo : turbulence macroscale
K
L
l
l
>
>δ
0
:
eddies
in
Flamelets
0
:
reactions
d
Distribute
l
>
L
δ


4
flow
time
flow
stic
characteri
τ
=
=
Da
Structure of Turbulent Premixed Flames
Three Flame Regimes
- Damkohler No.
chem
time
chemical
stic
characteri
τ
=
=
Da
보염기(flame holder) : 봉, 구, V…
uf : 미연혼합기의유속, L:재순환영역길이
접촉시간: τ = L / uf
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
′
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
=
′
=
rms
L
L
L
L
rms
v
S
S
v
Da
δ
δ
0
0
/
/
l
l
Recirculation
zone
접촉시간: τa
 L / uf
혼합기의화학반응특성시간τc= δ/SL
Da = τa / τc : Damko”hler 수
What means ?
Da < 1.0 : Blow-out
Da > 1.0 : fast-chemistry regime
Wrinkled Laminar-Flame Regime
Chemical reactions occur in thin sheets.
S
A
S
A
m
ρ
ρ
=
=
&
Turbulent burning rate
L
u
t
u
S
A
S
A
m
flamelets
ρ
ρ
=
=
A
A
S
S
L
t
/
/
flamelets
=


5
Burned gas
Unburned gas
Aflamelet
S
Wrinkled Laminar-Flame Regime
L
rms
L
t
S
v
S
S
/
1
/
′
+
=
SL
A-
St
Damkohler model
Clavin and Williams model
(
)
2
/
1
2
/
1
2
2 /
8
1
1
5
.
0
/
⎭
⎬
⎫
⎩
⎨
⎧
⎥⎦
⎤
⎢⎣
⎡
′
+
+
=
L
rms
L
t
S
v
C
S
S
Clavin and Williams model
C: constant = 1
2
2 /
1
/
S
v
C
S
S
′
+
=
Wrinkled Laminar-Flame Regime
for small values of v’rms/SL
/
1
/
L
rms
L
t
S
v
C
S
S
+
=
(
)
7
.
0
/
5
.
3
/
L
rms
L
t
S
v
S
S
′
=
Klimov model
for v’rms/SL>1.0


6
L
rms S
v
A
A
/
/
wrinkles
′
=
Wrinkled Laminar-Flame Regime
Extended to the turbulent flow by
L
rms
wrinkles
L
L
rms
L
L
t
S
S
v
S
A
A
A
S
A
A
S
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
′
+
=
+
=
=
1
wrinkles
flamelets
Awrinkles = Aflamelets – A-
Damkohler model
L ⎠
⎝
Wrinkled Laminar-Flame Regime
Winkled laminar-flame theories of turbulent flame


7
Distributed-Reaction Regime
Small Integral Scale,
lo/lL< 1, Da<1
( )
AB
B
A
T
k
→
+
chem
flow
time
chemical
stic
characteri
time
flow
stic
characteri
τ
τ
=
=
Da
τflow<τchem
single bimolecular reaction;
AB
B
A
→
+
[
][
]
B
A
A
X
X
k
−
=
ω&
: reaction rate (kmol/m3-s)
B
B
A
A
MW
Y
kY
dt
dY
ρ
−
=
[
][
]
B
A
A
X
X
k
−
=
ω&
Mass fractions
′
+
=
′
+
=
′
+
=
B
B
B
A
A
A
Y
Y
Y
Y
Y
Y
k
k
k
The instantaneous values
ρ
ρ
ρ
′
+
=
+
B
B
B
Y
Y
Y
(
)(
)(
)(
)
B
B
A
A
B
A
A
Y
Y
Y
Y
k
k
Y
Y
k
dt
dY
′
+
′
+
′
+
′
+
−
=
−
=
ρ
ρ
ρ
/
시간평균값


8
B
A
B
A
A
Y
Y
k
Y
Y
k
dt
dY
′
′
+
=
−
ρ
ρ
l i
i bl
ddi i
l
fi
MWB는속도상수k에흡수, 우측항은
B
A
B
A
Y
Y
k
Y
Y
k
′
′
′
′
+
−
+
′
′
′
+
−
+
ρ
ρ
terms
n
correlatio
variable
three
additional
three
terms
n
correlatio
variable
two
additional
five
Flamelets-In-Eddies Regime
-High turbulence intensity
High turbulence intensity
-v’rms/SL >> 1
-Some practical combustion devices
-No role the chemical reaction
-Turbulent mixing rates control combust.


9
Flamelets-In-Eddies Regime
Fuel mass burning rate per unit volume
(
)
2
/
3
/
2
0
F
F
F
v
Y
C
m
′
∈
′
−
=
′′′
ρ
&
CF: constant(0.1<CF<100),
Y’F,rms : rms fuel mass fraction
εo: turbulence dissipation rate 
(
)
2
/
3
/
0
,
rms
rms
F
F
F
v
Y
C
m
∈
ρ
등방성난류, v’ rms =v’x,rms = v’y,rms = v’z,rms
등하나의상수로정리
0
,
/l
&
rms
rms
F
F
F
v
Y
C
m
′
′
−
=
′′′
ρ
εo 등하나의상수로정리
Flame Stabilization 
-Low-velocity bypass ports
-Refractory burner tiles
Bl ff bod flameholders
-Bluff-body flameholders
-Swirl or jet-induced recirculating flow
-Rapid increase in flow area creating 
recirculating separated flow


10
-Bluff-body flameholders
공업용고부하연소기⇒고속기류중연소⇒화염안정화곤란
: 유동장중연소속도와같은정도의유속형성필요
Flameholders : 봉, 구, V…
uf : 미연혼합기의유속
-Bluff-body flameholders
R
i
l ti
uf : 미연혼합기의유속, 
L:
접촉시간: τa = L / uf
혼합기의화학반응특성시간τc= δ/SL
DI = τa / τc : Damko”hler 수
Recirculation
zone


11
Swirl or jet-induced recirculating flow
Swirl stabilized spray flame
Swirler
Nozzle


12
Homework 
Chapter 12
Problems
12.2, 12.6


# 과목1_연소공학_전남대 차시21 (1103295)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/13.pdf · 강의노트 PDF → md 변환물

1
Chapter 13
Turbulent Nonpremixed
Flames
1
School of Mechanical Systems Engineering
Chonnam Nat. Univ.
Prof. Byung-Chul Choi
Objectives 
For practical application, the designer’s issues:
- Flame shape and size
- Flame holding and stability
- Heat transfer (radiation)
- Pollutant emissions
2


2
Jet Flames
General observations
3
Flame Length
4


3
Flame length 
laminar
transitional
turbulent
laminar
transitional
turbulent
5
Flame length 
층류확산화염의길이
D
v
L
π
2
/
=
6
v : velocity, 
D : diffusion coefficient


4
Flame length 
7
층류확산화염의길이
D
v
L
π
2
/
=
v : velocity, 
D : diffusion coefficient
Flame length definitions :
(1) Visual determination
(2) Photograph
(3) The centerline temp.
(4) The mean mixture fraction on the flame axis
(4) The mean mixture fraction on the flame axis
8


5
Factor Affecting Flame Length
(1) Initial jet momentum flux and buoyant forces
(2) Stoichiometry
(3) Ratio of nozzle fluid to ambient gas density
(4) Initial jet diameter
(4) Initial jet diameter
For Initial jet momentum flux and buoyant forces
A flame Froude No.
2
/
1
4
/
1
2
/
3
⎤
⎡Δ
⎞
⎛
=
s
e
f
T
f
v
Fr
Momentum-controlled regime
9
⎥⎦
⎤
⎢⎣
⎡Δ
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
∞
∞
j
f
e
gd
T
T
ρ
ρ
buoyant-controlled regime
10
Comparison of jet flame heights with and 
without buoyancy


6
11
Flame length for jet diameter
Flame Radiation
R
Q
x ≡
&
rad
난류비예혼합화염은많은복사열발생- 이용혹은손실
복사율
복사열전달량
c
F
R
h
m
x
Δ
&
4
rad
f
f
p
T
V
a
Q
σ
≈
&
f
f
p
T
V
a
x ≡
4
σ
4
/
2
j
e
F
F
d
v
m
π
ρ
=
&
복사
전체방출열
12
c
F
R
h
m
x
Δ
≡
&
3
j
f
d
V ∝
j
e
j
f
p
R
v
d
T
a
x
/
4
∝


7
13
Jet flame radiation fractions 
of heat release rate and 
burner size
화염내soot 포함한
메탄화염
메탄화염
2.5-3, 4.5micro-m
강한복사
14
Spectral measurements of thermal radiation
from a nonpremixed CH4-air jet flame


8
Spectral measurements
15
Spectral measurements 
of thermal radiation from 
a nonpremixed C2H4-air 
jet flame
Liftoff and Blowout
Liftoff 기준
1. v’(SL max)=ST
(
L,max)
T
국지유속=난류화염속도
2. ε> εcrit
유체의국지변형율
3. τlocal mixing< τchem,crit
유동장스케일
16
Liftoff height versus jet exit velocity for CH4, 
C3H8, C2H4 jet flame


9
Liftoff and Blowout
(
)
H
H
e
L
e
Re
Re
S
v
6
5.1
max
,
10
5.3
1
017
.0
−
∞
⋅
−
=
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
ρ
ρ
e
L
e
H
H
S
Re
μ
ρ
max
,
=
j
e
F
e
F
d
Y
Y
H
⎥
⎥
⎦
⎤
⎢
⎢
⎣
⎡
−
⎟⎟
⎠
⎞
⎜⎜
⎝
⎛
=
∞
8.5
4
2
/
1
stoic
,
,
ρ
ρ
17
Blowout stability curve
Other Configurations
18
Swirl-flame burner having both tangential 
and axial air entries


10
19
Effect of swirl on flame length
No swirl                                                   Swirl No.=1.1
Homework Chapter 13
Review questions  3, 5
Problems 13.1, 13.6
20


# 과목1_연소공학_전남대 차시21 (1103296)
> 출처: KOCW http://contents.kocw.or.kr/KOCW/document/2015/chungnam/cholbyungchul/14.pdf · 강의노트 PDF → md 변환물

1
Chapter 15
Chapter 15
Pollutant Emissions
Pollutant Emissions
Pollutant Emissions
Pollutant Emissions
School of Mechanical Systems Engineering
Chonnam Nat. Univ.
Prof. Byung-Chul Choi
Pollutant Emissions
Pollutant Emissions
 Pollutants
Pollutants
 Pollutants
Pollutants
PM
PM(Particulate Matter)=
(Particulate Matter)=Soot+ash+metal fumes +aerosol
Soot+ash+metal fumes +aerosol
SOx (SO
SOx (SO2, SO
, SO3)
NOx(NO, NO
NOx(NO, NO2, N
, N2O) 
O) 
HC
HC
HC
HC
CO
CO
 Strength of Regulations
Strength of Regulations(air, room, Motors)
(air, room, Motors)


2
Objects
Objects
 Quantification of Emission
Quantification of Emission
 Quantification of Emission
Quantification of Emission
 Premixed Combustion
Premixed Combustion
- Emission and After
Emission and After-treatment
treatment
 Non
Non-premixed Combustion
premixed Combustion
p
- Emission and After
Emission and After-treatment
treatment
1. 
1. Quantification of Emission
Quantification of Emission
 Expression of Emission Levels  
Expression of Emission Levels  
ppm, g/mile (g/km), ….. 
ppm, g/mile (g/km), ….. 
(1) Emission Index (EI
(1) Emission Index (EIi)
m,emitted
,emitted
EI
EIi =                       (g/kg), 
=                       (g/kg), dimensionless
dimensionless (1)
(1)
m 
m F,burned
F,burned
F
h
b
i
f
HC f
l i
i
F
h
b
i
f
HC f
l i
i
For the combustion of a HC fuel in air
For the combustion of a HC fuel in air
C of HC           CO
C of HC           CO2, CO
, CO
Xi                  
i                  x MW
x MWi
EI
EIi = (                  )  (             )                 (2)
= (                  )  (             )                 (2)
Xco 
co + X
+ Xco2
co2
MW
MWF
Fuel Mole Weight
Species Mole Weight
Mole Fraction
C No. of fuel


3
(2) Corrected Concentration
(a) Wet : moisture is considered from the sample gas prior 
to analysis
to analysis
(b) Dry : moisture is removed from the sample gas 
- Assuming Stoichi. or lean combustion (w/o CO, H2 etc.)
CxHy + a O2 + 3.76a N2
(3)
x CO2 + y/2 H2O + b O2 + 3.76a N2 + trace species
Ni
Ni
Ni
Ni
X i,dry=                  = 
Nmix,dry
x + b + 3.76 a
Ni
Ni                                      (4)
X i,wet=                  = 
Nmix,wet
x + y/2 + b + 3.76 a
 By O
By O2 balance
balance
 2a = 2 x + y/2 + 2b
2a = 2 x + y/2 + 2b
b = a 
b = a - x x - y/4
y/4
 Nmix,wet
mix,wet
(x + b + 3.76 a) + y/2                 y/2
(x + b + 3.76 a) + y/2                 y/2
=                                     =  1 + 
=                                     =  1 + 
Nmix,dry
mix,dry
(x + b + 3.76 a)                  (x + b + 3.76 a) 
(x + b + 3.76 a)                  (x + b + 3.76 a) 
,
y
,
y
(
)
(
)
(
)
(
)
y                                                y
y                                                y
=                                             = 1 +                               
=                                             = 1 +                               
2(x + 
2(x + a a - x x - y/4
y/4 + 3.76 a)             2(4.76
+ 3.76 a)             2(4.76a a - y/4
y/4 )
Xi,dry
i,dry
=                                                                                     (5)
=                                                                                     (5)
Xi,wet 
i,wet 
No2
o2
b
 X 
X o2,dry
o2,dry =                   =                              
=                   =                              
N 
N mix,dry
mix,dry
(x + b +
(x + b + 3.76a
3.76a )
y
(
)
a a - x x - y/4                        a 
y/4                        a - x x - y/4
y/4
=                                            =                              
=                                            =                              
(x + 
(x + a a - x x - y/4
y/4 + 3.76a
3.76a )      (4.76
)      (4.76a a - y/4)
y/4)
x +y/4(1 
x +y/4(1 - X 
X o2,dry
o2,dry )
 a =                                                                                (6b)
a =                                                                                (6b)
(1 
(1 - 4.76a X 
4.76a X o2,dry
o2,dry )


4
No2
b
Xo2,wet =                   =                              
Nmix,wet
(x + y/2 + b + 3.76a )
a - x - y/4                                 a - x - y/4
=                                                  =                              
(x + y/2 + a - x - y/4 + 3.76a )      (4.76a + y/4) 
x +y/4(1 + Xo2
et )
x +y/4(1 + Xo2,wet )
a  =                                                                      (6a)         
(1 - 4.76a Xo2,wet )
Nmix,wet 
Xi,dry = Xi,wet
(7) 
Nmix,dry 
• from (5)
Nmix wet
y
2(4 76a + y/4)
Nmix,wet                     y                 2(4.76a + y/4)
=  1 +                       =                           
Nmix,dry             2(4.76a - y/4)     2(4.76a - y/4)
• Nmix,wet  =  (4.76a + y/4)                                   (9a)
• Nmix,dry  =  (4.76a - y/4)                                    (9b)
 Difference of O
Difference of O2 level,    from (7)
level,    from (7)
N 
N mix,
mix,O2
O2-level 1
level 1
Xi
Xi(corrected to  
(corrected to  =  
=  Xi
Xi (corrected to 
(corrected to 
O2
O2-Level2)              
Level2)              O2
O2-Level1
Level1)         
)         N 
N mix,o2
mix,o2-level 2
level 2
(3) 
(3) Various Specific Emission Measurer
Various Specific Emission Measurer
Fuel Mass Flow rate
Mass specific      Mass Flow of pollutant      m’
Mass specific      Mass Flow of pollutant      m’F EI 
EI i
emission         =                                         =
emission         =                                         =
(MSE)                       Brake Power                     W’
(MSE)                       Brake Power                     W’


5
2. Premixed Combustion
(1) 
(1) NOx Emission
NOx Emission
(a) Extended Zeldovich(thermal) Mechanism
(a) Extended Zeldovich(thermal) Mechanism
O
N
O
N
NO
NO
N
- O + N
O + N2
NO 
NO + N
+ N
- N + O
N + O2
NO
NO + O
+ O
- N + OH          
N + OH          NO
NO + H 
+ H 
(b)  Prompt NO (Fenimore Mechanism)
(b)  Prompt NO (Fenimore Mechanism)
- CH + N
CH + N2
HCN
HCN + N
+ N
- C + N
C + N2
CN
CN + N
+ N
- HCN
HCN + O       NCO + N
+ O       NCO + N
- NCO + H       NH + CO
NCO + H       NH + CO
- NH + H          N + H
NH + H          N + H2
- N  + OH         
N  + OH         NO
NO + H
+ H
- N2O intermediate mechanism
O intermediate mechanism
(c) Fuel Nitrogen Mechanism
(c) Fuel Nitrogen Mechanism
2. 
2. Premixed Combustion
Premixed Combustion
(2) 
(2) NOx control
NOx control
Thermal NOx
Thermal NOx
(a) Reaction time (by Zeldovich Mechanism)
(a) Reaction time (by Zeldovich Mechanism)
d[NO]                             
d[NO]                             0.5
0.5
= 2 k
= 2 kN1,f
N1,f [N
[N2][O
][O2]
dt  
dt  
(b) Temperature
(b) Temperature
b
kN1,f  
N1,f  = A T  exp(
= A T  exp(- Ea / (R
Ea / (Ru T))
T))
(c) O
(c) O2 availability(Air/Fuel ratio)
availability(Air/Fuel ratio)


6
Effect of Temperature on NOx emission
Effect of Temperature on NOx emission
2.5E+08
1.0E+08
1.5E+08
2.0E+08
action Rate Coeff. kf
kf = 1.82 x 10^14 x ex p(-38,370/T)
0.0E+00
5.0E+07
1500
1800
2100
2400
2700
3000
Temperature    K
Rea
NOx Control as function of A/F
NOx Control as function of A/F
Long burning time
Long burning time
Stoichiometric
rich
lean


7
NOx Control by Exhaust Gas 
NOx Control by Exhaust Gas 
Recirculation
Recirculation
Lean
Rich
(3)
(3) CO
CO
2. 
2. Premixed Combustion
Premixed Combustion
(3) 
(3) CO
CO
- Rich combustion products 
Rich combustion products 
incomplete combustion
incomplete combustion
- Intermediate species of HC combustion 
Intermediate species of HC combustion 
- SI Engine 
SI Engine 
Rich condition operating
Rich condition operating
: Rich condition operating 
: Rich condition operating 
during engine start
during engine start-up
up


8
Effects of exposure on humans
Effects of exposure on humans
사망
혼수
구토, 의기소침
4-6근두통
두통, 근육기능약화
무징후
Exhaust Emissions of SI Engine
Exhaust Emissions of SI Engine
10000
4000
6000
8000
10000
HC, CO, NOx
Stoichiometric(14.7)
CO
NOx
CO
NOx
HC
Stoichiometric
0
2000
0.6
0.8
1
1.2
1.4
1.6
1.8
Excess air ratio
H
HC
rich
lean
Lean
Rich


9
(3) 
(3) HC
HC
Low concentration
Low concentration
2. 
2. Premixed Combustion
Premixed Combustion
- Low concentration 
Low concentration 
- SI engine (Quenching region)
SI engine (Quenching region)
(5) 
(5) Catalytic After
Catalytic After-treatment
treatment
2. 
2. Premixed Combustion
Premixed Combustion
- Pellet type
Pellet type
- Monolith type
Monolith type
HC CONOx


10
(a) Catalytic converter
(1) Substrate
(2) Precious material(PM)
(3) Washcoating material
(a) Catalytic converter
(1) Substrate
(2) Precious material(PM)
(3) Washcoating material
(PM)


11
(b) Premixed combustion engine
1) Three-Way Catalyst(TWC) system
(1) Reaction mechanism
(3) PM effects
( )
2) Lean-burn engine catalyst
(1) Three-Way Catalyst 
(NOx Adsorption Catalyst)
(2) Oxidation catalyst
3) After-treatment system for LEV program
(1) CCC(Cl
C
l d C
l
)
(1) CCC(Close-Coupled Catalyst)
(2) EHC(Electrically Heated Catalyst)
(3) BHC(Burner Heated Catalyst)
(4) HC Adsorber system
TWC reaction and mechanisms
TWC reaction and mechanisms
CO + 1/2O2 = CO2
(1)
HC + O2 = H2O + CO2
(2)
O
O
( )
H2 + 1/2O2 = H2O
(3)
2NO + CO = N2O + CO2
(4)
NO + CO = 1/2N2 + CO2
(5)
2NO + H2 = N2O + H2O
(6)
NO + H2 = 1/2N2 + H2O
(7)
NO + HC = N2 + H2O + CO2
(8)
NO + 5/2H2
NH3 + H2O
(9)
NO + 5/2H2 = NH3 + H2O
(9)
CO + H2O = CO2 + H2
(10)
HC + H2O = CO + CO2 + H2
(11)
3NO + 2NH3 = 5/2N2 + 3H2O
(12)
2N2O = 2N2 + O2
(13)
2NH3 = N2 + 3H2
(14)


12
TWC of NOx adsorption and storage 
TWC of NOx adsorption and storage 
reduction
reduction
NO2
NO
Lean-Burn Condition
NO2
N2
CO2, H2O
Stoichiometric Condition
Washcoated Substrate
NO2
NO
O2
Washcoated Substrate
NO2
N2
HC, 
CO, 
H2
Reduction
Inlet Gas
: Precious Material(PM)
: NOx Adsorption and Storage Material
Lean
Rich
Outlet Gas
NOx 
Adsorption
Reaction mechanism of advanced TWC 
Reaction mechanism of advanced TWC 
for lean
for lean-burn
burn
PM
HC
O2
O2
PM
HC
O2
O2
PM
N2
O2
O2
NOx
O2
H2O
CO2
NOx
CO
Micro Pore
Micro Pore
Micro Pore
Zeolite
Zeolite
Zeolite


13
3. Premixed Combustion
After-treatment system for LEV program
y
p
g
(1) CCC(Close-Coupled Catalyst)
(2) EHC(Electrically Heated Catalyst)
(3) BHC(Burner Heated Catalyst)
(4) HC Ad
b
t
(4) HC Adsorber system
CCC(Close-Coupled Catalyst)
CCC


14
EHC(Electrically Heated Catalyst)
BHC(Burner Heated Catalyst)


15
HC adsorber system
HC Adsorber
3. Non-Premixed Combustion
(1) Combustion process
: evaporation
mixing(stratified charge)
lean
: evaporation - mixing(stratified charge) - lean
- Complex
(2) Pollutant Emissions
NOx : Zeldovich mechanism
HC and CO : overly lean regions
- no propagation of flame
no propagation of flame
: incomplete combustion
: short time for oxidation reaction
: over rich regions
PM : Soot+ash+metal fumes+aerosol
SOx : SO2,  SO3+H2O      H2SO4


16
(3) After-treatment method 
( )
- Nonpremixed combustion engine 
(a) Oxidation catalyst
CO + 1/2O2 = CO2
(1)
HC + O2 = H2O + CO2
(2)
(b) de-NOx catalyst
(b) de NOx catalyst
(c) DPF(Diesel Particulate Filter) 
NOx from turbulent hydrocarbon-air jet flames 
for various luminous


17
The influence of N2 dilution on radiant fractions, 
Flame temp., NOx emission
NOx Control Technologies
NOx Control Technologies
Combustion
Modification
Low Excess 
Air Ratio
Reburn
Staged 
Combustion
Temp. 
Reduction
Low NOx
Burner
Oxy./Gas
Combustion
Service
Biased 
Firing
Overfire 
Air
Staged 
Air
Staged 
Fuel
Fiber 
Burner
Reduced Air 
Preheating
Water 
Injection
Flue Gas 
Recirculation


18
Low NOx Burner Employing 
Air Staging
Rich-Lean Combustion
Low NOx Burner Employing 
Fuel Staging
Lean-Rich Combustion


19
Effects of Flue-gas Recirculation
on NOx Emission 
533K Air
Low NOx Burner Employing 
Reburn System


20
Parameters affecting NOx formation
Parameters affecting NOx formation
for Engine
for Engine
NOx
Local A/F Ratio
Local Temperature
Rate of Heat Release
Mixture Formation
Intake
Conditions
Fuel Inj.
System
Engine
Design
Fuel
Properties
Conditions
System
Design
Properties
- Intake Temp.
- Boost Press.
- EGR-Rate
- Inj. Press.
- Rate of Inj.
- Nozzle
Configuration
- Bowl Shape
- Swirl Level
- Compression
Level
- Cyl. Head Concept
(2V, 4V)
- Cetane
Number
NOx Control Technologies by 
Post-Combustion
Post-Combustion
Control
Selective
Non Catalytic 
Reduction
Selective
Catalytic 
Reduction
NH3
Urea
NH2/CH3OH
HC
NH3
Injection
Urea
Injection
NH2/CH3OH 
Injection
HC 
Injection
+


21
NOx Reduction Effectiveness for Selective 
NOx Reduction Effectiveness for Selective 
Non
Non-catalytic Reduction
catalytic Reduction
120
40
60
80
100
120
Ox Reduction,  %
NH3
NH2
Cyanicacid
0
20
1100
1150
1200
1250
1300
1350
Temperature           K
N
Mechanism of selective catalytic reduction 
Mechanism of selective catalytic reduction 
of NOx with HC
of NOx with HC
1. 2NO = N2 + O2
1. 2NO   N2
 O2
HC + O  = CO2 + H2O
2. HC + O2 (or NOx) = HC* + CO2 + H2O
HC* + NOx = N2 + CO2 + H2O
3. NO + 1/2O2 = NO2
HC + NO2 = N2 + CO2 + H2O
A kind of suggestion


22
Catalysts in selective catalytic reduction 
Catalysts in selective catalytic reduction 
of NOx with HC
of NOx with HC
1. Zeolites
- ion-exchanged zeolite : Cu Fe Co H Ga
- ion-exchanged zeolite : Cu, Fe, Co, H, Ga,  
Ce-ZSM-5
2. Oxides
- Silicoaluminophosphate : Al2O3, ZrO2,     
La2O3, MgO
- Single oxide : SiO2-ZnO, TiO2-ZnO, LaAlO3
M t lii
ti
id
- Metaliimpregnation oxides : 
Co, Fe, Cu, Ag, Au/Al2O3, V/TiO2
3. Precious Metal Catalyst
- Pt/Al2O3, Pt-ZSM-5, Pt-Ir/ZSM-5
PM Model
Adsorbed Hydrocarbons
Liquid Hydrocarbon 
Particle 10-80 nm
Fractal-like
Soot Agglomerate
50-500 nm
Carbon Spheres
(including metals)
10-80 nm
Liquid Sulfate Particle
1. attached to soot
2. freely in air
(~5 nm soot or ash core)
1. attached to soot
2. freely in air


23
Parameters affecting Particulates formation
Parameters affecting Particulates formation
Particulate Fractions
Carbon
Lube oil
Fuel
Sulfates+Water
Mixture Formation
Oil
Consumption
Fuel
Consumption
- Intake Conditions
(Temp Boost EGR)
- Engine Design
- Fuel Sulfur
(Temp. Boost, EGR)
- Intake Swirl Level
- Bowl Shape
- Injection Pressure
- Nozzle Configuration
- Fuel Properties
Engine Design
(Liner/Piston/Rings)
- Oil Leaks
(Valve Stems, TC)
- Lube Oil
Formulation
Fuel Sulfur
Content
Oxides of Sulfur
Oxides of Sulfur
1. SO2
1. SO2
2. SO3
SO3 + H2O Æ H2SO4
Reduction
- Remove  Fuel-S
CaCO3 + SO2 + 2H2O
- CaCO3 + SO2 + 2H2O         
Æ CaSO3.2H2O(limestone) + CO2
석회암


24
Homework
Homework
Chapter 15
Chapter 15
Problems
15.5, 15.8. 15.11
Thank you !
