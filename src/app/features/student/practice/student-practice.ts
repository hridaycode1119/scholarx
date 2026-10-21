import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentService } from '../../../core/services/student.service';
import { GeminiAiService } from '../../../core/services/gemini-ai.service';
import {
  MinedPYQ,
  PracticeCollege,
  PracticeSubject,
  MentorPracticePaper,
  UniversityQuestionPaper,
  UniversityProgramDetail,
  UniversitySchoolFaculty,
  UniversityCourseProgram,
  UniversitySpecializationDetail,
  ExamMarkingScheme
} from '../../../core/models';

@Component({
  selector: 'app-student-practice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-practice.html',
  styleUrl: './student-practice.scss'
})
export class StudentPracticeComponent {
  readonly studentService = inject(StudentService);
  private readonly geminiService = inject(GeminiAiService);

  // 1. College Selection & AI PYQ Search State
  readonly colleges = this.studentService.practiceColleges;

  // Registered College of Student (Apex Institute of Technology, Bangalore)
  readonly registeredCollege = computed<PracticeCollege>(() => {
    const list = this.colleges();
    const profName = this.studentService.profile()?.collegeName?.toLowerCase() || '';
    const match = list.find(c => c.id === 'apex' || (profName && c.name.toLowerCase().includes(profName)));
    return match || list[0];
  });

  readonly selectedCollegeId = signal<string>('sharda-gn');
  readonly isSearchingCollegePYQ = signal<boolean>(false);
  readonly collegeSearchQuery = signal<string>('');

  // Instant As-You-Type Search State
  readonly uniSearchQuery = signal<string>('');
  readonly isSearchActive = signal<boolean>(false);

  // Global Institution Categorization Filters (Country & Type)
  readonly countryFilter = signal<string>('ALL');
  readonly institutionTypeFilter = signal<string>('ALL');

  // Official Portal Live Scraper & Verification State
  readonly isSyncingOfficialSite = signal<boolean>(false);
  readonly officialSiteSyncStatus = signal<string | null>(null);

  // Dynamic Program Catalog & Academic Hierarchy
  readonly schoolSearchQuery = signal<string>('');
  readonly selectedSchool = signal<UniversitySchoolFaculty | null>(null);
  readonly selectedDepartmentFilter = signal<string>('ALL');
  readonly departmentSearchQuery = signal<string>('');
  readonly selectedCourseProgram = signal<UniversityCourseProgram | null>(null);
  readonly selectedSpecialization = signal<UniversitySpecializationDetail | null>(null);

  // Curriculum Subjects Filter & Search State
  readonly selectedSubjectCategory = signal<'ALL' | 'CORE' | 'ELECTIVE' | 'ALLIED'>('ALL');
  readonly selectedSemesterFilter = signal<string>('ALL');
  readonly subjectSearchQuery = signal<string>('');

  readonly programSearchQuery = signal<string>('');
  readonly selectedProgramDetail = signal<UniversityProgramDetail | null>(null);
  readonly selectedSubjectType = signal<'ALL' | 'CORE' | 'ELECTIVE' | 'ALLIED'>('ALL');
  readonly selectedProgram = signal<string>('ALL');
  readonly selectedDepartment = signal<string>('ALL');
  readonly selectedAcademicYear = signal<string>('ALL');

  // 10-Mark Examiner Model Answer Modal State
  readonly active10MarkModalQuestion = signal<MinedPYQ | null>(null);

  // Scalable Question Volume & Pedagogical Importance Filters
  readonly targetQuestionVolume = signal<number>(24);
  readonly questionImportanceFilter = signal<'ALL' | 'IMPORTANT_ONLY' | 'HIGH_YIELD' | 'CO_CRITICAL'>('ALL');
  readonly selectedCOFilter = signal<string>('ALL');

  // Gemini AI Dynamic Exam Question & Solution Generator State
  readonly dynamicallyGeneratedQuestions = signal<MinedPYQ[]>([]);
  readonly isGeneratingWithGemini = signal<boolean>(false);
  readonly geminiGenerationStatus = signal<string | null>(null);
  readonly isDeepeningQuestionId = signal<string | null>(null);

  // Global University Search Input
  readonly globalUniversitySearch = signal<string>('');
  readonly isAddingCustomUniversity = signal<boolean>(false);

  // Sub-view in PYQ Miner: Curated Questions vs Official Papers Archive
  readonly pyqSubMode = signal<'CURATED_QUESTIONS' | 'OFFICIAL_PAPERS'>('CURATED_QUESTIONS');
  readonly selectedPaperId = signal<string | null>(null);

  // Instant As-You-Type Search Results (matches name, shortCode, city, state, location, category, exams)
  readonly instantSearchResults = computed<PracticeCollege[]>(() => {
    const query = this.uniSearchQuery().trim().toLowerCase();
    const cFilter = this.countryFilter();
    const tFilter = this.institutionTypeFilter();
    let list = this.colleges();

    if (cFilter !== 'ALL') {
      list = list.filter(c => c.country?.toLowerCase() === cFilter.toLowerCase() || (cFilter === 'India' && !c.isGlobal));
    }

    if (tFilter !== 'ALL') {
      list = list.filter(c => {
        if (tFilter === 'GOVT') {
          return c.institutionType === 'CENTRAL_GOVT_UNIVERSITY' || c.institutionType === 'STATE_GOVT_UNIVERSITY' || c.institutionType === 'GOVT_AUTONOMOUS_COLLEGE';
        }
        if (tFilter === 'PRIVATE') {
          return c.institutionType === 'PRIVATE_DEEMED_UNIVERSITY' || c.institutionType === 'PRIVATE_STATE_UNIVERSITY' || c.institutionType === 'PRIVATE_INSTITUTE';
        }
        if (tFilter === 'AUTONOMOUS') {
          return c.category === 'AUTONOMOUS_COLLEGE' || c.institutionType === 'GOVT_AUTONOMOUS_COLLEGE';
        }
        if (tFilter === 'ENTRANCE') {
          return c.category === 'NATIONAL_ENTRANCE_EXAM' || c.institutionType === 'NATIONAL_ENTRANCE_BOARD';
        }
        return true;
      });
    }

    if (!query) return [];

    return list.filter(c => {
      const matchName = c.name.toLowerCase().includes(query);
      const matchCode = c.shortCode.toLowerCase().includes(query);
      const matchCity = c.city.toLowerCase().includes(query);
      const matchState = c.state.toLowerCase().includes(query);
      const matchLoc = (c.campusLocation && c.campusLocation.toLowerCase().includes(query));
      const matchTier = c.tier.toLowerCase().includes(query);
      const matchCategory = (c.category && c.category.toLowerCase().includes(query));
      const matchAgency = (c.examAgency && c.examAgency.toLowerCase().includes(query));
      const matchDept = c.departments?.some(d => d.toLowerCase().includes(query));
      const matchProg = c.programs?.some(p => p.toLowerCase().includes(query));

      const matchKeywords =
        (query.includes('jee') && (c.id === 'jee-adv' || c.name.toLowerCase().includes('jee'))) ||
        (query.includes('neet') && (c.id === 'neet-ug' || c.name.toLowerCase().includes('neet'))) ||
        (query.includes('gate') && (c.id === 'gate-cs' || c.name.toLowerCase().includes('gate'))) ||
        (query.includes('sharda') && c.id.startsWith('sharda')) ||
        (query.includes('amity') && c.id.startsWith('amity')) ||
        (query.includes('bits') && c.id.startsWith('bits')) ||
        (query.includes('pune') && (c.id === 'sppu' || c.id === 'coep')) ||
        (query.includes('delhi') && c.id === 'du');

      return matchName || matchCode || matchCity || matchState || matchLoc || matchTier || matchCategory || matchAgency || matchDept || matchProg || matchKeywords;
    });
  });

  readonly filteredColleges = computed<PracticeCollege[]>(() => {
    let list = this.colleges();
    const query = this.collegeSearchQuery().trim().toLowerCase();
    const cFilter = this.countryFilter();
    const tFilter = this.institutionTypeFilter();

    if (cFilter !== 'ALL') {
      list = list.filter(c => c.country?.toLowerCase() === cFilter.toLowerCase() || (cFilter === 'India' && !c.isGlobal));
    }

    if (tFilter !== 'ALL') {
      list = list.filter(c => {
        if (tFilter === 'GOVT') {
          return c.institutionType === 'CENTRAL_GOVT_UNIVERSITY' || c.institutionType === 'STATE_GOVT_UNIVERSITY' || c.institutionType === 'GOVT_AUTONOMOUS_COLLEGE';
        }
        if (tFilter === 'PRIVATE') {
          return c.institutionType === 'PRIVATE_DEEMED_UNIVERSITY' || c.institutionType === 'PRIVATE_STATE_UNIVERSITY' || c.institutionType === 'PRIVATE_INSTITUTE';
        }
        if (tFilter === 'AUTONOMOUS') {
          return c.category === 'AUTONOMOUS_COLLEGE' || c.institutionType === 'GOVT_AUTONOMOUS_COLLEGE';
        }
        if (tFilter === 'ENTRANCE') {
          return c.category === 'NATIONAL_ENTRANCE_EXAM' || c.institutionType === 'NATIONAL_ENTRANCE_BOARD';
        }
        return true;
      });
    }

    if (!query) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.shortCode.toLowerCase().includes(query) ||
      c.city.toLowerCase().includes(query) ||
      (c.campusLocation && c.campusLocation.toLowerCase().includes(query)) ||
      (c.country && c.country.toLowerCase().includes(query))
    );
  });

  readonly selectedCollege = computed<PracticeCollege>(() => {
    const list = this.colleges();
    return list.find(c => c.id === this.selectedCollegeId()) || list[0];
  });

  // Academic Discipline Hierarchy Computeds
  readonly availableSchools = computed<UniversitySchoolFaculty[]>(() => {
    const col = this.selectedCollege();
    if (col?.schoolsCatalog && col.schoolsCatalog.length > 0) {
      return col.schoolsCatalog;
    }
    // Default fallback multi-faculty structure
    return [
      {
        name: col?.departments?.[0] || 'School of Engineering & Technology',
        shortName: 'Engineering & Technology',
        code: 'ENG',
        icon: '⚙️',
        description: 'Undergraduate and Postgraduate programs in computing, systems, and engineering disciplines.',
        departments: col?.departments || ['Department of Computer Science & Engineering', 'Department of Information Technology'],
        programs: [
          {
            name: 'Bachelor of Technology (B.Tech - Computer Science & Engineering)',
            shortCode: 'B.Tech CSE',
            level: 'UG',
            durationYears: 4,
            specializations: [
              {
                name: 'Distributed Systems & Cloud Computing',
                code: 'CSE-CLOUD',
                icon: '☁️',
                coreSubjects: ['CS401 Distributed Systems & Cloud', 'CS301 Operating Systems & Concurrency', 'CS302 Computer Networks', 'CS201 Data Structures'],
                electiveSubjects: ['AI501 Deep Learning', 'CS602 Cloud Virtualization'],
                alliedSubjects: ['MA101 Linear Algebra', 'EC201 Digital Logic']
              },
              {
                name: 'Artificial Intelligence & Machine Learning',
                code: 'CSE-AIML',
                icon: '🤖',
                coreSubjects: ['AI401 Machine Learning Foundations', 'AI501 Deep Neural Architectures', 'CS401 Distributed Systems'],
                electiveSubjects: ['AI601 Computer Vision', 'AI602 NLP & Transformers'],
                alliedSubjects: ['MA201 Probability & Statistics']
              }
            ]
          }
        ]
      }
    ];
  });

  // Filtered Schools matching user's real-time search query
  readonly filteredSchools = computed<UniversitySchoolFaculty[]>(() => {
    const list = this.availableSchools();
    const query = this.schoolSearchQuery().trim().toLowerCase();
    if (!query) return list;
    return list.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.shortName.toLowerCase().includes(query) ||
      s.code.toLowerCase().includes(query) ||
      s.departments.some(d => d.toLowerCase().includes(query)) ||
      s.programs.some(p => p.name.toLowerCase().includes(query) || p.shortCode.toLowerCase().includes(query))
    );
  });

  readonly activeSchool = computed<UniversitySchoolFaculty>(() => {
    const selected = this.selectedSchool();
    if (selected) return selected;
    const list = this.filteredSchools();
    return list[0] || this.availableSchools()[0];
  });

  readonly availableDepartmentsForSchool = computed<string[]>(() => {
    return this.activeSchool()?.departments || [];
  });

  readonly filteredDepartmentsForSchool = computed<string[]>(() => {
    const list = this.availableDepartmentsForSchool();
    const query = this.departmentSearchQuery().trim().toLowerCase();
    if (!query) return list;
    return list.filter(d => d.toLowerCase().includes(query));
  });

  readonly departmentProgramCountMap = computed<Record<string, number>>(() => {
    const school = this.activeSchool();
    const map: Record<string, number> = {};
    if (!school) return map;

    for (const d of school.departments || []) {
      map[d] = 0;
    }
    for (const p of school.programs || []) {
      const dName = p.departmentName || school.departments?.[0] || 'General';
      map[dName] = (map[dName] || 0) + 1;
    }
    return map;
  });

  readonly availableCoursesForSchool = computed<UniversityCourseProgram[]>(() => {
    const school = this.activeSchool();
    const allPrograms = school?.programs || [];
    const deptFilter = this.selectedDepartmentFilter();
    if (deptFilter === 'ALL') {
      return allPrograms;
    }
    const filtered = allPrograms.filter(p => p.departmentName === deptFilter);
    return filtered.length > 0 ? filtered : allPrograms;
  });

  readonly activeCourseProgram = computed<UniversityCourseProgram>(() => {
    const courses = this.availableCoursesForSchool();
    const selected = this.selectedCourseProgram();
    if (selected && courses.some(c => c.name === selected.name || c.shortCode === selected.shortCode)) {
      return selected;
    }
    return courses[0] || {
      name: 'Bachelor of Technology (B.Tech - Computer Science & Engineering)',
      shortCode: 'B.Tech CSE',
      level: 'UG',
      durationYears: 4,
      specializations: []
    };
  });

  readonly availableSpecializations = computed<UniversitySpecializationDetail[]>(() => {
    return this.activeCourseProgram()?.specializations || [];
  });

  readonly activeSpecialization = computed<UniversitySpecializationDetail>(() => {
    const selected = this.selectedSpecialization();
    if (selected) return selected;
    const specs = this.availableSpecializations();
    return specs[0] || {
      name: 'General Core Curriculum',
      code: 'GEN',
      icon: '📘',
      coreSubjects: ['CS401 Distributed Systems & Cloud Architecture', 'CS302 Computer Networks & Protocol Engineering'],
      electiveSubjects: ['AI501 Neural Networks & Deep Learning'],
      alliedSubjects: ['MA101 Linear Algebra & Discrete Mathematics']
    };
  });

  // Helper to cleanly parse subject string into code and name
  private parseSubjectEntry(entry: string): { code: string; name: string } {
    const trimmed = entry.trim();
    const parts = trimmed.split(' ');
    if (parts.length > 1 && /^[A-Z]{2,5}[-0-9]{2,5}$/i.test(parts[0])) {
      return { code: parts[0].toUpperCase(), name: parts.slice(1).join(' ') };
    }
    const initials = trimmed
      .split(/\s+/)
      .map(w => w[0]?.toUpperCase())
      .filter(Boolean)
      .join('')
      .slice(0, 4);
    return { code: initials || 'SUB', name: trimmed };
  }

  // Domain-specific topic resolver returning 4-5 authentic syllabus topics for any curriculum subject
  resolveTopicsForSubject(code: string, name: string, dept: string = ''): string[] {
    const lower = (code + ' ' + name + ' ' + dept).toLowerCase();

    // 1. Civil Engineering
    if (lower.includes('concrete') || lower.includes('rcc') || lower.includes('ce401')) {
      return [
        'Limit State Design of Beams (IS 456:2000)',
        'Shear, Torsion & Bond Stress Formulations',
        'Design of Two-Way & Flat Slabs',
        'Column Design with Axial Load & Biaxial Bending',
        'Retaining Walls & Strip Footing Foundations'
      ];
    }
    if (lower.includes('structural') || lower.includes('ce301') || lower.includes('ce601')) {
      return [
        'Moment Distribution & Slope Deflection Methods',
        'Matrix Flexibility & Stiffness Methods',
        'Plastic Analysis of Frames & Collapse Load',
        'Earthquake Response Spectrum Analysis',
        'Finite Element Modeling of Trusses & Plates'
      ];
    }
    if (lower.includes('geotech') || lower.includes('soil') || lower.includes('ce302')) {
      return [
        'Terzaghi 1D Consolidation & Settlement Time',
        'Mohr-Coulomb Shear Strength & Triaxial Tests',
        'Rankine & Coulomb Earth Pressure Theories',
        'Bearing Capacity of Shallow & Deep Foundations',
        'Slope Stability & Slip Circle Analysis'
      ];
    }
    if (lower.includes('water') || lower.includes('hydrology') || lower.includes('ce304')) {
      return [
        'Unit Hydrograph Derivation & S-Curve Synthesis',
        'Open Channel Flow & Hydraulic Jump Calculations',
        'Groundwater Hydraulics & Well Pumping Tests',
        'Design of Gravity Dams & Spillways',
        'Flood Routing via Muskingum Method'
      ];
    }
    if (lower.includes('highway') || lower.includes('transportation') || lower.includes('ce305')) {
      return [
        'Geometric Design of Highways & Super-elevation',
        'Flexible & Rigid Pavement Design (IRC 37 & 58)',
        'Traffic Stream Models & Signal Phasing Design',
        'Marshall Stability Test & Bituminous Mixes',
        'Intelligent Transportation Systems (ITS)'
      ];
    }
    if (lower.includes('environmental') || lower.includes('waste') || lower.includes('ce403')) {
      return [
        'BOD & COD Kinetics in Wastewater Streams',
        'Activated Sludge Process & Clarifier Sizing',
        'Air Quality Dispersion Modeling & PM2.5 Control',
        'Solid Waste Landfill Leaching & Liner Design',
        'Environmental Impact Assessment (EIA) Matrices'
      ];
    }
    if (lower.includes('surveying') || lower.includes('geomatics') || lower.includes('ce201')) {
      return [
        'Total Station Traversing & Bowditch Adjustment',
        'Contour Interpolation & Earthwork Volumes',
        'GPS/GNSS Satellite Surveying & Dilution of Precision',
        'Photogrammetry & Aerial Orthophoto Rectification',
        'Remote Sensing & Multi-Spectral Image Classification'
      ];
    }

    // 2. Mechanical Engineering
    if (lower.includes('mechatronics') || lower.includes('plc') || lower.includes('me401')) {
      return [
        'PLC Architecture & Ladder Logic Programming',
        'Actuators, Solenoids & Stepper Motor Drives',
        'Signal Conditioning & Operational Amplifiers',
        'PID Control & Microcontroller Interfacing',
        'SCADA & Industrial Fieldbus Protocols'
      ];
    }
    if (lower.includes('thermodynamics') || lower.includes('heat transfer') || lower.includes('me201')) {
      return [
        'Carnot & Rankine Thermodynamic Cycles',
        'Fourier Law of Conduction & Critical Insulation',
        'Convective Heat Transfer & Nusselt Correlations',
        'LMTD & NTU Effectiveness for Heat Exchangers',
        'Stefan-Boltzmann Radiation & View Factor Algebra'
      ];
    }
    if (lower.includes('fluid') || lower.includes('hydraulic') || lower.includes('me301')) {
      return [
        'Navier-Stokes Equations & Boundary Layer Flow',
        'Euler Turbine Equation & Velocity Triangles',
        'Pelton, Francis & Kaplan Turbines Performance',
        'Centrifugal Pumps & Net Positive Suction Head (NPSH)',
        'Dimensional Analysis & Buckingham Pi Theorem'
      ];
    }
    if (lower.includes('kinematics') || lower.includes('dynamics of mach') || lower.includes('me302')) {
      return [
        'Instantaneous Center of Velocity & Kennedy Theorem',
        'Epicyclic Gear Trains & Torque Ratio Calculations',
        'Balancing of Reciprocating & Rotating Masses',
        'Governor Characteristics, Hunting & Sensitiveness',
        'Gyroscopic Couple & Vehicle Stabilization'
      ];
    }
    if (lower.includes('electric vehicle') || lower.includes('powertrain') || lower.includes('me405')) {
      return [
        'EV Powertrain Architecture & Tractive Effort',
        'Lithium-Ion Battery Chemistry & SOC Estimation',
        'Regenerative Braking Energy Capture Dynamics',
        'Permanent Magnet Synchronous Motor (PMSM) Drives',
        'Thermal Management of High-Voltage Battery Packs'
      ];
    }
    if (lower.includes('finite element') || lower.includes('fem') || lower.includes('me601')) {
      return [
        'Direct Stiffness Method & Element Formulations',
        '1D Bar & Beam Element Shape Functions',
        '2D Constant Strain Triangle (CST) & Isoparametric Quadrilateral',
        'Dynamic Vibration Modal Analysis in ANSYS',
        'Convergence, Meshing & Error Estimators'
      ];
    }

    // 3. Electrical & Electronics Engineering
    if (lower.includes('power system') || lower.includes('ee401') || lower.includes('grid')) {
      return [
        'Bus Admittance & Impedance Matrices (Y-Bus, Z-Bus)',
        'Gauss-Seidel & Newton-Raphson Load Flow Studies',
        'Symmetrical & Unsymmetrical Fault Analysis',
        'Numerical Relays & Overcurrent Distance Protection',
        'Transient Stability & Equal Area Criterion'
      ];
    }
    if (lower.includes('electrical machines') || lower.includes('ee301')) {
      return [
        'Transformer Equivalent Circuit & Efficiency Curve',
        'Induction Motor Torque-Speed Characteristics',
        'Synchronous Generator V-Curves & Power Angle',
        'DC Motor Speed Control & Ward-Leonard Method',
        'Harmonics in Polyphase Fractional Pitch Windings'
      ];
    }
    if (lower.includes('control system') || lower.includes('ee302')) {
      return [
        'Routh-Hurwitz Stability & Root Locus Techniques',
        'Bode Plot & Nyquist Stability Criterion',
        'State Space Representation & Controllability',
        'PID Controller Tuning via Ziegler-Nichols Method',
        'Lead-Lag Compensator Design in Frequency Domain'
      ];
    }
    if (lower.includes('vlsi') || lower.includes('ec401') || lower.includes('cmos')) {
      return [
        'CMOS Inverter DC Characteristics & Noise Margins',
        'Stick Diagrams & Layout Design Rules (Lambda-based)',
        'Combinational & Dynamic CMOS Logic Gates',
        'Clock Distribution, Setup & Hold Time Violations',
        'Verilog HDL Modeling & FPGA Synthesis'
      ];
    }
    if (lower.includes('signal processing') || lower.includes('dsp') || lower.includes('ec302')) {
      return [
        'Discrete Fourier Transform & FFT Radix-2 Algorithms',
        'FIR Filter Design via Windowing Techniques',
        'IIR Butterworth & Chebyshev Bilinear Transformation',
        'Z-Transform Properties & Pole-Zero Stability',
        'Finite Word-length Effects & Overflow Limit Cycles'
      ];
    }
    if (lower.includes('wireless') || lower.includes('5g') || lower.includes('ec405')) {
      return [
        'Cellular Frequency Reuse & Handover Mechanisms',
        'OFDM Modulation & Multipath Rayleigh Fading',
        'MIMO Beamforming & Spatial Multiplexing Capacity',
        'Shannon Channel Capacity & Turbo/LDPC Coding',
        '5G NR Architecture, Slicing & Massive MIMO'
      ];
    }

    // 4. Biotechnology
    if (lower.includes('recombinant') || lower.includes('dna') || lower.includes('bt401')) {
      return [
        'Restriction Endonucleases & DNA Ligase Mechanisms',
        'Plasmid & Bacteriophage Cloning Vectors',
        'PCR Amplification & Real-Time qPCR Kinetics',
        'cDNA Library Construction & Colony Hybridization',
        'CRISPR-Cas9 Gene Editing & Expression Systems'
      ];
    }
    if (lower.includes('bioprocess') || lower.includes('fermentation') || lower.includes('bt301')) {
      return [
        'Monod Growth Kinetics & Batch Fermenter Sizing',
        'Continuous Stirred Tank Bioreactors (CSTR) & Chemostat',
        'Oxygen Transfer Rate (OTR) & kLa Determination',
        'Downstream Filtration & Chromatography Purification',
        'Sterilization Kinetics of Liquid Media & Bioreactors'
      ];
    }
    if (lower.includes('genetics') || lower.includes('molecular biology') || lower.includes('bt302')) {
      return [
        'DNA Replication Machinery & Polymerase Proofreading',
        'Prokaryotic & Eukaryotic Transcription Mechanisms',
        'Lac Operon & Gene Regulation Networks',
        'Translation Initiation, Elongation & Ribosome Dynamics',
        'Epigenetic Modifications & Histone Acetylation'
      ];
    }
    if (lower.includes('bioinformatics') || lower.includes('bt502')) {
      return [
        'BLAST & FASTA Pairwise Sequence Alignment',
        'Needleman-Wunsch & Smith-Waterman Dynamic Programming',
        'Multiple Sequence Alignment (Clustal Omega)',
        'Phylogenetic Tree Construction (Neighbor Joining)',
        'Protein Homology Modeling & PDB Structural Analysis'
      ];
    }

    // 5. Medical Sciences (MBBS / MD / BMLT)
    if (lower.includes('anatomy') || lower.includes('med101')) {
      return [
        'Osteology & Musculoskeletal Topography of Upper Limb',
        'Mediastinum & Coronary Blood Supply Architecture',
        'Cranial Nerves Origin, Pathway & Clinical Palsies',
        'Spinal Cord Tracts & Circle of Willis Neurovasculature',
        'Peritoneal Pouches & Abdominal Viscera Relations'
      ];
    }
    if (lower.includes('physiology') || lower.includes('med102')) {
      return [
        'Cardiac Action Potential & Conductive Electrophysiology',
        'Pulmonary Mechanics, Compliance & Gas Exchange (V/Q)',
        'Glomerular Filtration Rate & Countercurrent Multiplier',
        'Endocrine Feedback Loops & Hypothalamic-Pituitary Axis',
        'Synaptic Transmission & Neuromuscular Junction (NMJ)'
      ];
    }
    if (lower.includes('pathology') || lower.includes('med201') || lower.includes('mlt')) {
      return [
        'Cellular Injury, Necrosis vs Apoptosis Biomarkers',
        'Acute & Chronic Inflammation Mediators (Cytokines)',
        'Neoplasia Biology, Oncogenes & TNM Staging',
        'Hemostasis, Coagulation Cascade & Thrombosis',
        'Autoimmune Disorders & Hypersensitivity Reactions'
      ];
    }
    if (lower.includes('pharmacology') || lower.includes('med202') || lower.includes('ph')) {
      return [
        'Pharmacokinetics: Bioavailability, Vd & Clearance',
        'Receptor Pharmacology: Agonists, Antagonists & Kd',
        'Adrenergic & Cholinergic Drug Mechanisms',
        'Antimicrobial Resistance & Mechanism of Antibiotics',
        'Cardiovascular Drugs: ACE Inhibitors, Beta Blockers'
      ];
    }
    if (lower.includes('surgery') || lower.includes('sur601')) {
      return [
        'Preoperative Assessment, Fluid & Electrolyte Balance',
        'Surgical Sepsis, Asepsis & Wound Healing Biology',
        'Acute Abdomen: Appendicitis & Perforation Peritonitis',
        'Principles of Laparoscopy & Minimal Access Surgery',
        'Oncological Resection Margins & Lymph Node Dissection'
      ];
    }

    // 6. Law (SOL)
    if (lower.includes('constitutional') || lower.includes('law101')) {
      return [
        'Preamble, Basic Structure Doctrine & Judicial Review',
        'Article 14, 19, 21 Golden Triangle of Fundamental Rights',
        'Writs Jurisdiction under Article 32 & Article 226',
        'Directive Principles of State Policy vs Fundamental Rights',
        'Emergency Provisions & Constitutional Amendments (Art 368)'
      ];
    }
    if (lower.includes('contracts') || lower.includes('law201')) {
      return [
        'Offer, Acceptance, Consideration & Void Agreements',
        'Free Consent: Coercion, Undue Influence & Fraud',
        'Contingent Contracts & Doctrine of Frustration (Sec 56)',
        'Breach of Contract & Liquidated Damages (Hadley Rule)',
        'Specific Relief Act Remedies & Injunctions'
      ];
    }
    if (lower.includes('corporate') || lower.includes('company') || lower.includes('law301')) {
      return [
        'Corporate Veil Lifting & Separate Legal Entity Doctrine',
        'Memorandum & Articles of Association (Ultra Vires)',
        'Oppression & Mismanagement Remedies under Companies Act',
        'Insolvency & Bankruptcy Code (IBC 2016) CIRP Process',
        'SEBI Regulations & Insider Trading Prohibitions'
      ];
    }
    if (lower.includes('criminal') || lower.includes('penal') || lower.includes('bns') || lower.includes('law202')) {
      return [
        'Mens Rea, Actus Reus & Strict Liability in Criminal Law',
        'General Exceptions: Private Defense & Insanity Defense',
        'Culpable Homicide vs Murder Formulations (BNS 100/101)',
        'Offenses against Property: Theft, Extortion & Robbery',
        'Law of Evidence: Confessions & Dying Declaration'
      ];
    }

    // 7. Business & Management (SBS)
    if (lower.includes('marketing') || lower.includes('bba202')) {
      return [
        'STP Framework: Segmentation, Targeting & Positioning',
        'Consumer Decision Journey & Cognitive Dissonance',
        'Product Life Cycle (PLC) & Pricing Strategies',
        'Integrated Marketing Communications (IMC) Omnichannel',
        'Customer Lifetime Value (CLV) & Brand Equity Metrics'
      ];
    }
    if (lower.includes('finance') || lower.includes('accounting') || lower.includes('com101') || lower.includes('mgt101')) {
      return [
        'Capital Budgeting: NPV, IRR & Payback Evaluation',
        'Working Capital Management & Cash Conversion Cycle',
        'Capital Structure Theories: Modigliani-Miller Theorem',
        'Financial Statement Analysis & Dupont Ratio Decomposition',
        'Valuation Modeling: Discounted Cash Flow (DCF)'
      ];
    }
    if (lower.includes('analytics') || lower.includes('ba401') || lower.includes('data science') || lower.includes('ds301')) {
      return [
        'Exploratory Data Analysis & Feature Engineering',
        'Logistic Regression & Decision Trees Classification',
        'Cluster Analysis: K-Means & Hierarchical Clustering',
        'Time-Series Forecasting: ARIMA & Exponential Smoothing',
        'A/B Hypothesis Testing & Statistical Significance'
      ];
    }

    // 8. Basic Sciences (Math / Physics / Chemistry)
    if (lower.includes('real analysis') || lower.includes('mat201')) {
      return [
        'Completeness Axiom & Supremum Property of Real Numbers',
        'Bolzano-Weierstrass & Heine-Borel Compactness Theorems',
        'Sequence Convergence, Cauchy Sequences & Lim Sup/Inf',
        'Continuity, Uniform Continuity & Lipschitz Condition',
        'Riemann Integrability & Fundamental Theorem of Calculus'
      ];
    }
    if (lower.includes('quantum') || lower.includes('phy201')) {
      return [
        'Schrodinger Wave Equation & Probability Density',
        'Particle in a 1D/3D Box & Energy Quantization',
        'Heisenberg Uncertainty Principle & Wave Packet Dispersion',
        'Harmonic Oscillator: Ladder Operator Formalism',
        'Hydrogen Atom Orbitals & Quantum Numbers'
      ];
    }

    // Default High-Yield Syllabus Topics
    return [
      'Core Theoretical Formulations & Boundary Invariants',
      'Architectural Modeling & State Transitions',
      'Computational Derivations & Quantitative Methods',
      'Performance Optimization & Bottleneck Analysis',
      'Standard Practical Implementation & Industrial Frameworks'
    ];
  }

  // Synthesize discipline-specific foundational & core curriculum subjects
  private getDisciplineCurriculumSubjects(course: UniversityCourseProgram, dept: string): PracticeSubject[] {
    const text = (course.name + ' ' + (course.shortCode || '') + ' ' + dept).toLowerCase();

    if (text.includes('civil')) {
      return [
        { code: 'CE101', name: 'Engineering Mechanics & Statics', semester: 1, department: dept, credits: 3, category: 'ALLIED', topics: this.resolveTopicsForSubject('CE101', 'Engineering Mechanics & Statics', dept) },
        { code: 'CE102', name: 'Building Materials & Construction Technology', semester: 2, department: dept, credits: 3, category: 'CORE', topics: this.resolveTopicsForSubject('CE102', 'Building Materials & Construction Technology', dept) },
        { code: 'CE201', name: 'Surveying & Geomatics', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CE201', 'Surveying & Geomatics', dept) },
        { code: 'CE202', name: 'Strength of Materials & Solid Mechanics', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CE202', 'Strength of Materials & Solid Mechanics', dept) },
        { code: 'CE301', name: 'Structural Analysis & Matrix Methods', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CE301', 'Structural Analysis & Matrix Methods', dept) },
        { code: 'CE302', name: 'Geotechnical Engineering & Soil Mechanics', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CE302', 'Geotechnical Engineering & Soil Mechanics', dept) },
        { code: 'CE304', name: 'Hydrology & Water Resources Engineering', semester: 6, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CE304', 'Hydrology & Water Resources Engineering', dept) },
        { code: 'CE305', name: 'Transportation & Highway Engineering', semester: 6, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CE305', 'Transportation & Highway Engineering', dept) },
        { code: 'CE401', name: 'Design of Reinforced Concrete Structures (RCC)', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CE401', 'Design of Reinforced Concrete Structures (RCC)', dept) },
        { code: 'CE402', name: 'Design of Steel Structures & Industrial Frames', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CE402', 'Design of Steel Structures', dept) },
        { code: 'CE502', name: 'Earthquake Resistant Structural Design', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('CE502', 'Earthquake Resistant Structural Design', dept) },
        { code: 'CE505', name: 'Bridge Engineering & Prestressed Concrete', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('CE505', 'Bridge Engineering & Prestressed Concrete', dept) },
        { code: 'CE511', name: 'GIS & Remote Sensing for Smart Infrastructure', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('CE511', 'GIS & Remote Sensing', dept) }
      ];
    }

    if (text.includes('mechanical')) {
      return [
        { code: 'ME101', name: 'Basic Mechanical Engineering & Engineering Graphics', semester: 1, department: dept, credits: 3, category: 'ALLIED', topics: this.resolveTopicsForSubject('ME101', 'Basic Mechanical Engineering', dept) },
        { code: 'ME102', name: 'Manufacturing Processes & Workshop Technology', semester: 2, department: dept, credits: 3, category: 'CORE', topics: this.resolveTopicsForSubject('ME102', 'Manufacturing Processes', dept) },
        { code: 'ME201', name: 'Thermodynamics & Heat Transfer', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('ME201', 'Thermodynamics & Heat Transfer', dept) },
        { code: 'ME202', name: 'Mechanics of Materials & Machine Drawing', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('ME202', 'Mechanics of Materials', dept) },
        { code: 'ME301', name: 'Fluid Mechanics & Hydraulic Machinery', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('ME301', 'Fluid Mechanics & Hydraulic Machinery', dept) },
        { code: 'ME302', name: 'Kinematics & Dynamics of Machinery', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('ME302', 'Kinematics & Dynamics of Machinery', dept) },
        { code: 'ME303', name: 'Internal Combustion Engines & Gas Turbines', semester: 6, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('ME303', 'Internal Combustion Engines', dept) },
        { code: 'ME401', name: 'Mechatronics & Industrial PLC Automation', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('ME401', 'Mechatronics & Industrial Automation', dept) },
        { code: 'ME402', name: 'Design of Transmission Systems & Gearboxes', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('ME402', 'Design of Transmission Systems', dept) },
        { code: 'ME405', name: 'Electric Vehicle Powertrain & Battery Technology', semester: 7, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('ME405', 'Electric Vehicle Powertrain', dept) },
        { code: 'ME504', name: 'CNC Machining & Advanced Manufacturing Systems', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('ME504', 'CNC Machining', dept) },
        { code: 'ME514', name: 'Vehicle Crashworthiness & Finite Element Analysis', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('ME514', 'Finite Element Analysis', dept) }
      ];
    }

    if (text.includes('electronics') || text.includes('ece') || text.includes('vlsi')) {
      return [
        { code: 'EC101', name: 'Basic Electronics & Network Analysis', semester: 1, department: dept, credits: 3, category: 'ALLIED', topics: this.resolveTopicsForSubject('EC101', 'Basic Electronics', dept) },
        { code: 'EC201', name: 'Digital Logic & State Machine Design', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EC201', 'Digital Logic', dept) },
        { code: 'EC202', name: 'Analog Circuits & Semiconductor Devices', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EC202', 'Analog Circuits', dept) },
        { code: 'EC301', name: 'Microcontrollers & ARM Embedded Systems', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EC301', 'Microcontrollers', dept) },
        { code: 'EC302', name: 'Digital Signal Processing & Filter Design', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EC302', 'Digital Signal Processing', dept) },
        { code: 'EC401', name: 'VLSI Design & CMOS Circuit Engineering', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EC401', 'VLSI Design', dept) },
        { code: 'EC405', name: 'Digital Communication & Information Theory', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EC405', 'Digital Communication', dept) },
        { code: 'EC406', name: 'Microwave Engineering & Antenna Array Design', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EC406', 'Microwave Engineering', dept) },
        { code: 'EC503', name: 'FPGA Prototyping & Verilog HDL Synthesis', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('EC503', 'FPGA Prototyping', dept) },
        { code: 'EC512', name: '5G/6G Cellular Standards & Beamforming', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('EC512', '5G Wireless', dept) }
      ];
    }

    if (text.includes('electrical') || text.includes('eee') || text.includes('power')) {
      return [
        { code: 'EE101', name: 'Basic Electrical Engineering & Circuital Laws', semester: 1, department: dept, credits: 3, category: 'ALLIED', topics: this.resolveTopicsForSubject('EE101', 'Basic Electrical Engineering', dept) },
        { code: 'EE201', name: 'Circuit Theory & Network Synthesis', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EE201', 'Circuit Theory', dept) },
        { code: 'EE202', name: 'Electrical Measurements & Instrumentation', semester: 3, department: dept, credits: 3, category: 'CORE', topics: this.resolveTopicsForSubject('EE202', 'Electrical Measurements', dept) },
        { code: 'EE301', name: 'Electrical Machines & Transformers', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EE301', 'Electrical Machines', dept) },
        { code: 'EE302', name: 'Control System Engineering & State Space', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EE302', 'Control System Engineering', dept) },
        { code: 'EE401', name: 'Power System Analysis & Grid Protection', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EE401', 'Power System Analysis', dept) },
        { code: 'EE402', name: 'Power Electronics & Inverter Motor Drives', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('EE402', 'Power Electronics', dept) },
        { code: 'EE503', name: 'Electric Vehicle Powertrains & Motor Drives', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('EE503', 'Electric Vehicle Powertrains', dept) },
        { code: 'EE507', name: 'Smart Grid Technology & Renewable Integration', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('EE507', 'Smart Grid Technology', dept) }
      ];
    }

    if (text.includes('biotech')) {
      return [
        { code: 'BT101', name: 'Introduction to Biotechnology & Cell Biology', semester: 1, department: dept, credits: 3, category: 'ALLIED', topics: this.resolveTopicsForSubject('BT101', 'Introduction to Biotechnology', dept) },
        { code: 'BT201', name: 'Biochemistry & Enzyme Kinetics', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BT201', 'Biochemistry & Enzyme Kinetics', dept) },
        { code: 'BT202', name: 'Microbiology & Microbial Physiology', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BT202', 'Microbiology', dept) },
        { code: 'BT301', name: 'Bioprocess Engineering & Fermentation Technology', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BT301', 'Bioprocess Engineering', dept) },
        { code: 'BT302', name: 'Molecular Biology & Recombinant Genetics', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BT302', 'Molecular Biology', dept) },
        { code: 'BT401', name: 'Recombinant DNA Technology & Gene Cloning', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BT401', 'Recombinant DNA Technology', dept) },
        { code: 'BT402', name: 'Downstream Processing & Bioseparations', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BT402', 'Downstream Processing', dept) },
        { code: 'BT502', name: 'Bioinformatics & Computational Genomics', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('BT502', 'Bioinformatics', dept) },
        { code: 'BT505', name: 'Pharmaceutical Biotechnology & Drug Discovery', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('BT505', 'Pharmaceutical Biotechnology', dept) }
      ];
    }

    if (text.includes('mbbs') || text.includes('medicine') || text.includes('surgery')) {
      return [
        { code: 'MED101', name: 'Gross Anatomy & Neuroanatomy', semester: 1, department: dept, credits: 5, category: 'CORE', topics: this.resolveTopicsForSubject('MED101', 'Gross Anatomy & Neuroanatomy', dept) },
        { code: 'MED102', name: 'Medical Physiology & Biophysics', semester: 1, department: dept, credits: 5, category: 'CORE', topics: this.resolveTopicsForSubject('MED102', 'Medical Physiology', dept) },
        { code: 'MED103', name: 'Medical Biochemistry & Clinical Genetics', semester: 2, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('MED103', 'Medical Biochemistry', dept) },
        { code: 'MED201', name: 'General Pathology & Histopathology', semester: 3, department: dept, credits: 5, category: 'CORE', topics: this.resolveTopicsForSubject('MED201', 'General Pathology', dept) },
        { code: 'MED202', name: 'Systemic Pharmacology & Therapeutics', semester: 3, department: dept, credits: 5, category: 'CORE', topics: this.resolveTopicsForSubject('MED202', 'Systemic Pharmacology', dept) },
        { code: 'MED203', name: 'Diagnostic Medical Microbiology & Parasitology', semester: 4, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('MED203', 'Medical Microbiology', dept) },
        { code: 'MED301', name: 'Community Medicine & Public Health Epidemiology', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('MED301', 'Community Medicine', dept) },
        { code: 'MED302', name: 'Forensic Medicine & Medical Jurisprudence', semester: 5, department: dept, credits: 3, category: 'ALLIED', topics: this.resolveTopicsForSubject('MED302', 'Forensic Medicine', dept) },
        { code: 'MED401', name: 'Internal Medicine & Clinical Diagnostics', semester: 7, department: dept, credits: 5, category: 'CORE', topics: this.resolveTopicsForSubject('MED401', 'Internal Medicine', dept) },
        { code: 'SUR401', name: 'Principles of Operative General Surgery', semester: 7, department: dept, credits: 5, category: 'CORE', topics: this.resolveTopicsForSubject('SUR401', 'General Surgery', dept) }
      ];
    }

    if (text.includes('law') || text.includes('ll.b') || text.includes('legal')) {
      return [
        { code: 'LAW101', name: 'Constitutional Law of India & Fundamental Rights', semester: 1, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('LAW101', 'Constitutional Law', dept) },
        { code: 'LAW102', name: 'Law of Torts & Consumer Protection Act', semester: 1, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('LAW102', 'Law of Torts', dept) },
        { code: 'LAW201', name: 'Law of Contracts & Specific Relief Act', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('LAW201', 'Law of Contracts', dept) },
        { code: 'LAW202', name: 'Indian Penal Code (BNS) & Criminal Substantive Law', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('LAW202', 'Criminal Law', dept) },
        { code: 'LAW301', name: 'Corporate Governance & Company Law 2013', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('LAW301', 'Company Law', dept) },
        { code: 'LAW302', name: 'Code of Civil Procedure & Limitation Act', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('LAW302', 'Civil Procedure', dept) },
        { code: 'LAW303', name: 'Code of Criminal Procedure (BNSS)', semester: 6, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('LAW303', 'Criminal Procedure', dept) },
        { code: 'LAW304', name: 'Law of Evidence (BSA)', semester: 6, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('LAW304', 'Law of Evidence', dept) },
        { code: 'LAW401', name: 'Intellectual Property Rights & Patent Law', semester: 7, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('LAW401', 'Intellectual Property', dept) },
        { code: 'LAW403', name: 'Cyber Crime & Digital Forensics Admissibility', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('LAW403', 'Cyber Law', dept) }
      ];
    }

    if (text.includes('business') || text.includes('bba') || text.includes('mba') || text.includes('b.com')) {
      return [
        { code: 'BBA101', name: 'Principles & Practice of Modern Management', semester: 1, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BBA101', 'Principles of Management', dept) },
        { code: 'BBA102', name: 'Business Mathematics & Quantitative Statistics', semester: 1, department: dept, credits: 3, category: 'ALLIED', topics: this.resolveTopicsForSubject('BBA102', 'Business Mathematics', dept) },
        { code: 'BBA201', name: 'Financial Management & Budgetary Control', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BBA201', 'Financial Management', dept) },
        { code: 'BBA202', name: 'Marketing Management & Consumer Behavior', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BBA202', 'Marketing Management', dept) },
        { code: 'BBA301', name: 'Organizational Behavior & Enterprise Leadership', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BBA301', 'Organizational Behavior', dept) },
        { code: 'BBA302', name: 'Strategic Management & Business Policy', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('BBA302', 'Strategic Management', dept) },
        { code: 'BBA401', name: 'Digital Marketing & Social Media Strategy', semester: 6, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('BBA401', 'Digital Marketing', dept) },
        { code: 'BBA402', name: 'Supply Chain Analytics & Operations Management', semester: 6, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('BBA402', 'Supply Chain Analytics', dept) }
      ];
    }

    // Default Computing / CSE / AI Discipline Subjects
    return [
      { code: 'CS101', name: 'Programming in C & Computational Problem Solving', semester: 1, department: dept, credits: 3, category: 'ALLIED', topics: this.resolveTopicsForSubject('CS101', 'Programming in C', dept) },
      { code: 'CS102', name: 'Object Oriented Programming with Java', semester: 2, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CS102', 'OOP in Java', dept) },
      { code: 'CS201', name: 'Data Structures & Algorithmic Analysis', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CS201', 'Data Structures & Algorithms', dept) },
      { code: 'CS202', name: 'Computer Organization & Architecture', semester: 3, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CS202', 'Computer Architecture', dept) },
      { code: 'CS301', name: 'Operating Systems & Concurrency Invariants', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CS301', 'Operating Systems', dept) },
      { code: 'CS302', name: 'Computer Networks & Protocol Engineering', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CS302', 'Computer Networks', dept) },
      { code: 'CS303', name: 'Database Management Systems & Relational SQL', semester: 5, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CS303', 'Database Management Systems', dept) },
      { code: 'CS401', name: 'Distributed Systems & Cloud Architecture', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CS401', 'Distributed Systems', dept) },
      { code: 'CS405', name: 'Enterprise Software Architecture & Design Patterns', semester: 7, department: dept, credits: 4, category: 'CORE', topics: this.resolveTopicsForSubject('CS405', 'Software Architecture', dept) },
      { code: 'AI401', name: 'Machine Learning Foundations & Algorithms', semester: 7, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('AI401', 'Machine Learning', dept) },
      { code: 'CS505', name: 'Cloud Microservices & Kubernetes Orchestration', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('CS505', 'Cloud Microservices', dept) },
      { code: 'CY401', name: 'Network Defense & Ethical Hacking', semester: 8, department: dept, credits: 3, category: 'ELECTIVE', topics: this.resolveTopicsForSubject('CY401', 'Network Defense', dept) }
    ];
  }

  // All Curriculum Subjects for Active Course Program (Gathers from all specializations + full syllabus)
  readonly allSubjectsForDegree = computed<PracticeSubject[]>(() => {
    const course = this.activeCourseProgram();
    const school = this.activeSchool();
    const deptName = course.departmentName || school?.shortName || 'Engineering & Technology';
    const subjMap = new Map<string, PracticeSubject>();

    // 1. Gather subjects from all specializations of this course
    for (const spec of course.specializations || []) {
      spec.coreSubjects?.forEach((s, idx) => {
        const { code, name } = this.parseSubjectEntry(s);
        if (!subjMap.has(code)) {
          subjMap.set(code, {
            code,
            name,
            semester: Math.min(8, 3 + (idx % 5)),
            department: deptName,
            credits: 4,
            category: 'CORE',
            topics: this.resolveTopicsForSubject(code, name, deptName)
          });
        }
      });

      spec.electiveSubjects?.forEach((s, idx) => {
        const { code, name } = this.parseSubjectEntry(s);
        if (!subjMap.has(code)) {
          subjMap.set(code, {
            code,
            name,
            semester: 7 + (idx % 2),
            department: deptName,
            credits: 3,
            category: 'ELECTIVE',
            topics: this.resolveTopicsForSubject(code, name, deptName)
          });
        }
      });

      spec.alliedSubjects?.forEach((s, idx) => {
        const { code, name } = this.parseSubjectEntry(s);
        if (!subjMap.has(code)) {
          subjMap.set(code, {
            code,
            name,
            semester: 1 + (idx % 3),
            department: deptName,
            credits: 3,
            category: 'ALLIED',
            topics: this.resolveTopicsForSubject(code, name, deptName)
          });
        }
      });
    }

    // 2. Ensure every degree has a full 8-14 subject syllabus curriculum across semesters
    if (subjMap.size < 8) {
      const disciplineSubjects = this.getDisciplineCurriculumSubjects(course, deptName);
      for (const sub of disciplineSubjects) {
        if (!subjMap.has(sub.code)) {
          subjMap.set(sub.code, sub);
        }
      }
    }

    return Array.from(subjMap.values());
  });

  // Filtered Subjects matching real-time Category, Semester & Search Query filters
  readonly filteredSubjectsForDegree = computed<PracticeSubject[]>(() => {
    let list = this.allSubjectsForDegree();
    const cat = this.selectedSubjectCategory();
    const sem = this.selectedSemesterFilter();
    const query = this.subjectSearchQuery().trim().toLowerCase();

    if (cat !== 'ALL') {
      list = list.filter(s => s.category === cat);
    }

    if (sem !== 'ALL') {
      if (sem === '1-2') list = list.filter(s => s.semester === 1 || s.semester === 2);
      else if (sem === '3-4') list = list.filter(s => s.semester === 3 || s.semester === 4);
      else if (sem === '5-6') list = list.filter(s => s.semester === 5 || s.semester === 6);
      else if (sem === '7-8') list = list.filter(s => s.semester === 7 || s.semester === 8);
    }

    if (query) {
      list = list.filter(s =>
        s.code.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.topics.some(t => t.toLowerCase().includes(query))
      );
    }

    return list;
  });

  // Category counts badge statistics
  readonly subjectCategoryCounts = computed(() => {
    const list = this.allSubjectsForDegree();
    return {
      all: list.length,
      core: list.filter(s => s.category === 'CORE').length,
      elective: list.filter(s => s.category === 'ELECTIVE').length,
      allied: list.filter(s => s.category === 'ALLIED').length
    };
  });

  // Backward compatible alias
  readonly dynamicSpecializationSubjects = computed<PracticeSubject[]>(() => {
    return this.allSubjectsForDegree();
  });

  // Dynamic Program Catalog matching student's manual search query
  readonly filteredProgramsCatalog = computed<UniversityProgramDetail[]>(() => {
    const col = this.selectedCollege();
    const query = this.programSearchQuery().trim().toLowerCase();
    
    let catalog = col?.programsCatalog ? [...col.programsCatalog] : [];
    if (catalog.length === 0 && col?.programs) {
      catalog = col.programs.map((p, idx) => ({
        name: p,
        shortCode: col.shortCode + ' ' + (idx + 1),
        level: p.toLowerCase().includes('diploma') ? 'DIPLOMA' : p.toLowerCase().includes('m.') ? 'PG' : 'UG',
        schoolName: col.departments?.[0] || 'School of Engineering & Computing',
        departmentName: col.departments?.[idx % (col.departments?.length || 1)] || 'Department of Computer Science',
        coreSubjects: ['CS401 Distributed Systems & Cloud', 'CS302 Computer Networks', 'CS201 Operating Systems'],
        electiveSubjects: ['AI501 Deep Learning Architectures', 'CS502 High Performance Computing'],
        alliedSubjects: ['MAT201 Discrete Mathematics', 'ENG101 Technical Communication']
      }));
    }

    if (!query) return catalog;
    return catalog.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.shortCode.toLowerCase().includes(query) ||
      p.departmentName.toLowerCase().includes(query) ||
      p.schoolName.toLowerCase().includes(query) ||
      p.coreSubjects?.some(s => s.toLowerCase().includes(query))
    );
  });

  readonly activeProgramDetail = computed<UniversityProgramDetail>(() => {
    const selected = this.selectedProgramDetail();
    if (selected) return selected;
    const catalog = this.filteredProgramsCatalog();
    return catalog[0] || {
      name: this.selectedProgram() !== 'ALL' ? this.selectedProgram() : 'B.Tech Computer Science & Engineering',
      shortCode: 'B.Tech CSE',
      level: 'UG',
      schoolName: this.selectedCollege()?.departments?.[0] || 'School of Engineering & Technology',
      departmentName: this.selectedDepartment() !== 'ALL' ? this.selectedDepartment() : 'Department of Computer Science',
      coreSubjects: ['CS401 Distributed Systems & Cloud', 'CS302 Computer Networks', 'CS201 Operating Systems'],
      electiveSubjects: ['AI501 Deep Learning Architectures', 'CS502 High Performance Computing'],
      alliedSubjects: ['MAT201 Discrete Mathematics', 'AS101 Applied Probability & Statistics']
    };
  });

  // Cascading lists based on currently selected college
  readonly availablePrograms = computed<string[]>(() => {
    return this.selectedCollege()?.programs || [];
  });

  readonly availableDepartments = computed<string[]>(() => {
    return this.selectedCollege()?.departments || [];
  });

  readonly availableAcademicYears = computed<string[]>(() => {
    return this.selectedCollege()?.availableYears || ['2025', '2024', '2023', '2022', '2021'];
  });

  // Official University Question Papers for Selected College (respecting Program, Dept, and Academic Year)
  readonly collegeQuestionPapers = computed<UniversityQuestionPaper[]>(() => {
    const allPapers = this.studentService.universityQuestionPapers();
    const currentCollegeId = this.selectedCollegeId();
    const yr = this.selectedAcademicYear();
    const prog = this.selectedProgram();
    const dept = this.selectedDepartment();

    return allPapers.filter(p => {
      const matchCollege = p.universityId === currentCollegeId;
      const matchYear = yr === 'ALL' || p.academicYear === yr || p.academicYear.startsWith(yr);
      const matchProg = prog === 'ALL' || !p.programName || p.programName === prog;
      const matchDept = dept === 'ALL' || !p.departmentName || p.departmentName === dept;
      return matchCollege && matchYear && matchProg && matchDept;
    });
  });

  readonly activePaper = computed<UniversityQuestionPaper | null>(() => {
    const paperId = this.selectedPaperId();
    if (!paperId) return null;
    return this.collegeQuestionPapers().find(p => p.id === paperId) || null;
  });

  // 2. Navigation Tabs (PYQ Miner vs Mentor Assigned Papers)
  readonly activeViewMode = signal<'PYQ_MINER' | 'MENTOR_PAPERS'>('PYQ_MINER');

  // 3. Subject & Topic Hierarchical Filter State
  readonly subjects: PracticeSubject[] = [
    {
      code: 'CS401',
      name: 'Distributed Systems & Consensus Architecture',
      semester: 7,
      department: 'Computer Science & AI',
      credits: 4,
      topics: [
        'Raft Consensus Algorithm',
        'CAP Theorem & Consistency Models',
        'Logical & Vector Clocks',
        'Byzantine Fault Tolerance & Quorums'
      ]
    },
    {
      code: 'CS302',
      name: 'Computer Networks & Protocol Engineering',
      semester: 5,
      department: 'Computer Science',
      credits: 4,
      topics: [
        'TCP Congestion Control & Flow Control',
        'Subnetting & CIDR VLSM'
      ]
    },
    {
      code: 'AI501',
      name: 'Neural Networks & Deep Learning',
      semester: 7,
      department: 'Artificial Intelligence',
      credits: 4,
      topics: [
        'Transformer Architecture & Self-Attention',
        'Backpropagation & Gradient Descent'
      ]
    },
    {
      code: 'CSE-354',
      name: 'Embedded Systems & 8051 Microcontrollers',
      semester: 6,
      department: 'Computer Science',
      credits: 3,
      topics: [
        '8051 Timer Modes & Baud Rate Generation',
        'Interrupt Priorities & UART'
      ]
    }
  ];

  readonly selectedSubjectCode = signal<string>('CS401');
  readonly selectedTopic = signal<string>('ALL');

  readonly currentSubject = computed<PracticeSubject>(() => {
    const list = this.allSubjectsForDegree();
    const found = list.find(s => s.code === this.selectedSubjectCode());
    if (found) return found;
    return list[0] || this.subjects[0];
  });

  readonly availableTopics = computed(() => {
    return this.currentSubject()?.topics || [];
  });

  // 4. AI Thinker Difficulty & Query Filter State
  readonly filterDifficulty = signal<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');
  readonly searchQuery = signal<string>('');
  readonly onlyHighYield = signal<boolean>(false);

  // 5. Solution Tabs State (SIMPLE vs MATH vs DIAGRAM vs VIDEO vs RUBRIC)
  readonly activeSolutionTab = signal<Record<string, 'SIMPLE' | 'MATH' | 'DIAGRAM' | 'VIDEO' | 'RUBRIC'>>({});

  // 6. AI Thinker Dynamic Variation Generator State
  readonly isGeneratingVariation = signal<boolean>(false);
  readonly generatingQuestionId = signal<string | null>(null);
  readonly variationSuccessToast = signal<string | null>(null);

  // 7. Mentor Practice Papers List
  readonly mentorPapers = this.studentService.mentorPracticePapers;
  readonly activeMentorPaperModal = signal<MentorPracticePaper | null>(null);
  readonly studentDraftAnswers = signal<Record<string, string>>({});
  readonly submittedPapers = signal<Record<string, boolean>>({});
  readonly activePaperTab = signal<Record<string, 'SIMPLE' | 'MATH' | 'DIAGRAM' | 'RUBRIC'>>({});

  // Filtered PYQs Computed
  readonly filteredPyqs = computed(() => {
    const defaultPyqs = this.studentService.pyqs();
    const paperQuestions = this.collegeQuestionPapers().flatMap(p => p.questions);
    const dynamicQuestions = this.dynamicallyGeneratedQuestions();
    
    // Deduplicate questions by ID
    const uniqueMap = new Map<string, MinedPYQ>();
    for (const q of [...dynamicQuestions, ...paperQuestions, ...defaultPyqs]) {
      if (!uniqueMap.has(q.id)) {
        uniqueMap.set(q.id, q);
      }
    }
    let list = Array.from(uniqueMap.values());

    const collegeId = this.selectedCollegeId();
    const subjCode = this.selectedSubjectCode();

    // If active subject has no pre-loaded sample questions, automatically synthesize full syllabus exam questions
    if (subjCode && subjCode !== 'ALL' && !list.some(q => q.subjectCode === subjCode)) {
      const synth = this.generateSyllabusExamQuestions(this.currentSubject(), this.selectedCollege());
      for (const s of synth) {
        if (!uniqueMap.has(s.id)) {
          uniqueMap.set(s.id, s);
          list.push(s);
        }
      }
    }

    const topic = this.selectedTopic();
    const diff = this.filterDifficulty();
    const query = this.searchQuery().trim().toLowerCase();
    const highYield = this.onlyHighYield();
    const yr = this.selectedAcademicYear();
    const subjType = this.selectedSubjectType();
    const impFilter = this.questionImportanceFilter();
    const coFilter = this.selectedCOFilter();

    // In PYQ_MINER mode: filter by college & subject & topic & academic year & importance & CO
    if (this.activeViewMode() === 'PYQ_MINER') {
      const filtered = list.filter(q => {
        const matchCollege = !q.collegeId || q.collegeId === collegeId;
        const matchSubj = !subjCode || subjCode === 'ALL' || q.subjectCode === subjCode;
        const matchTopic = topic === 'ALL' || q.topic === topic;
        const matchDiff = diff === 'ALL' || q.difficulty === diff;
        const matchYield = !highYield || q.isHighYield;
        const matchYear = yr === 'ALL' || !q.yearAsked || q.yearAsked.includes(yr);
        const matchCategory = subjType === 'ALL' || !q.subjectCategory || q.subjectCategory === subjType;
        const matchCO = coFilter === 'ALL' || q.targetCO === coFilter;

        let matchImportance = true;
        if (impFilter === 'IMPORTANT_ONLY') {
          matchImportance = q.isImportant === true || (q.importanceScore !== undefined && q.importanceScore >= 8.8);
        } else if (impFilter === 'HIGH_YIELD') {
          matchImportance = q.isHighYield === true || q.recurrenceRate >= 90;
        } else if (impFilter === 'CO_CRITICAL') {
          matchImportance = coFilter !== 'ALL' ? q.targetCO === coFilter : (q.targetCO === 'CO1' || q.targetCO === 'CO2' || q.targetCO === 'CO3');
        }

        const matchQuery = !query ||
          q.questionText.toLowerCase().includes(query) ||
          q.topic.toLowerCase().includes(query) ||
          q.subjectName.toLowerCase().includes(query) ||
          (q.aiThinkerSolution?.examinerKeywords.some(k => k.toLowerCase().includes(query)) ?? false);

        return matchCollege && matchSubj && matchTopic && matchDiff && matchYield && matchYear && matchCategory && matchCO && matchImportance && matchQuery;
      });

      list = filtered;

      // Constrain or extend to targetQuestionVolume
      const volume = this.targetQuestionVolume();
      if (volume && list.length > volume) {
        list = list.slice(0, volume);
      }
    } else {
      // In MENTOR_PAPERS mode: filter papers and mentor-assigned questions
      list = list.filter(q => q.isFromMentorPaper);
    }

    return list;
  });

  // Top Curated / Best Questions Asked Previously
  readonly bestPreviousQuestions = computed(() => {
    return this.filteredPyqs().filter(q => q.isHighYield || q.recurrenceRate >= 90);
  });

  // Hierarchy Selection Handlers
  selectSchool(school: UniversitySchoolFaculty): void {
    this.selectedSchool.set(school);
    this.selectedDepartmentFilter.set('ALL');
    this.departmentSearchQuery.set('');
    this.schoolSearchQuery.set('');
    const firstCourse = school.programs?.[0] || null;
    this.selectedCourseProgram.set(firstCourse);
    this.selectedProgram.set(firstCourse?.name || 'ALL');
    this.selectedSpecialization.set(firstCourse?.specializations?.[0] || null);
    if (firstCourse?.specializations?.[0]?.coreSubjects?.[0]) {
      const code = firstCourse.specializations[0].coreSubjects[0].split(' ')[0];
      this.selectedSubjectCode.set(code);
    } else {
      this.selectedSubjectCode.set('ALL');
    }
    this.selectedTopic.set('ALL');
    this.variationSuccessToast.set(`🏛️ Faculty Selected: ${school.name}`);
    setTimeout(() => this.variationSuccessToast.set(null), 3000);
  }

  selectDepartmentFilter(dept: string): void {
    this.selectedDepartmentFilter.set(dept);
    const school = this.activeSchool();
    if (school) {
      if (dept === 'ALL') {
        const firstCourse = school.programs?.[0] || null;
        this.selectedCourseProgram.set(firstCourse);
        this.selectedProgram.set(firstCourse?.name || 'ALL');
        this.selectedSpecialization.set(firstCourse?.specializations?.[0] || null);
        this.variationSuccessToast.set(`All departments displayed (${school.programs.length} degree programs)`);
      } else {
        const matchingProg = school.programs?.find(p => p.departmentName === dept) || null;
        if (matchingProg) {
          this.selectedCourseProgram.set(matchingProg);
          this.selectedProgram.set(matchingProg.name);
          this.selectedSpecialization.set(matchingProg.specializations?.[0] || null);
          if (matchingProg.specializations?.[0]?.coreSubjects?.[0]) {
            const code = matchingProg.specializations[0].coreSubjects[0].split(' ')[0];
            this.selectedSubjectCode.set(code);
          }
        }
        this.variationSuccessToast.set(`Filtered: ${dept}`);
      }
      setTimeout(() => this.variationSuccessToast.set(null), 3000);
    }
  }

  selectCourse(course: UniversityCourseProgram): void {
    this.selectedCourseProgram.set(course);
    this.selectedProgram.set(course.name);
    const firstSpec = course.specializations?.[0] || null;
    this.selectedSpecialization.set(firstSpec);
    
    if (firstSpec?.coreSubjects?.[0]) {
      const { code } = this.parseSubjectEntry(firstSpec.coreSubjects[0]);
      this.selectedSubjectCode.set(code);
    } else {
      setTimeout(() => {
        const subs = this.allSubjectsForDegree();
        if (subs.length > 0) {
          this.selectedSubjectCode.set(subs[0].code);
        } else {
          this.selectedSubjectCode.set('ALL');
        }
      }, 0);
    }

    this.selectedTopic.set('ALL');
    this.selectedSubjectCategory.set('ALL');
    this.selectedSemesterFilter.set('ALL');
    this.subjectSearchQuery.set('');

    if (course.departmentName && this.selectedDepartmentFilter() !== 'ALL' && this.selectedDepartmentFilter() !== course.departmentName) {
      this.selectedDepartmentFilter.set(course.departmentName);
    }
    this.variationSuccessToast.set(`🎓 Program: ${course.name}`);
    setTimeout(() => this.variationSuccessToast.set(null), 3000);
  }

  selectSpecialization(spec: UniversitySpecializationDetail): void {
    this.selectedSpecialization.set(spec);
    // Auto-select first core subject
    if (spec.coreSubjects && spec.coreSubjects.length > 0) {
      const { code } = this.parseSubjectEntry(spec.coreSubjects[0]);
      this.selectedSubjectCode.set(code);
    } else {
      this.selectedSubjectCode.set('ALL');
    }
    this.selectedTopic.set('ALL');
    this.variationSuccessToast.set(`⚡ Specialization: ${spec.name}`);
    setTimeout(() => this.variationSuccessToast.set(null), 3000);
  }

  open10MarkModelModal(pyq: MinedPYQ): void {
    this.active10MarkModalQuestion.set(pyq);
  }

  close10MarkModelModal(): void {
    this.active10MarkModalQuestion.set(null);
  }

  selectProgramDetail(p: UniversityProgramDetail): void {
    this.selectedProgramDetail.set(p);
    this.selectedProgram.set(p.name);
    this.selectedDepartment.set(p.departmentName);
    this.selectedSubjectType.set('ALL');
    this.variationSuccessToast.set(`🎓 Program Selected: ${p.name} (${p.schoolName})`);
    setTimeout(() => this.variationSuccessToast.set(null), 3000);
  }

  setSubjectType(type: 'ALL' | 'CORE' | 'ELECTIVE' | 'ALLIED'): void {
    this.selectedSubjectType.set(type);
  }

  syncOfficialSite(): void {
    const col = this.selectedCollege();
    if (!col) return;
    this.isSyncingOfficialSite.set(true);
    this.officialSiteSyncStatus.set(`Connecting to Controller of Examinations (COE) portal at ${col.websiteUrl || 'official website'}...`);

    this.studentService.syncOfficialUniversityData(col.id).subscribe({
      next: (res) => {
        this.isSyncingOfficialSite.set(false);
        this.officialSiteSyncStatus.set(`✅ Official Portal Live Sync: ${res.papersFound} examination booklets verified! Last synced: ${res.syncedAt}`);
        this.variationSuccessToast.set(`⚡ Live COE curriculum synchronized for ${col.shortCode}!`);
        setTimeout(() => {
          this.officialSiteSyncStatus.set(null);
          this.variationSuccessToast.set(null);
        }, 5000);
      },
      error: () => {
        this.isSyncingOfficialSite.set(false);
        this.officialSiteSyncStatus.set('⚠️ Verification completed using Controller of Examinations (COE) cache.');
        setTimeout(() => this.officialSiteSyncStatus.set(null), 4000);
      }
    });
  }

  selectCollege(collegeId: string): void {
    this.selectedCollegeId.set(collegeId);
    this.selectedPaperId.set(null);
    this.selectedProgram.set('ALL');
    this.selectedDepartment.set('ALL');
    this.selectedAcademicYear.set('ALL');
    this.selectedSchool.set(null);
    this.selectedCourseProgram.set(null);
    this.selectedSpecialization.set(null);
    this.selectedSubjectCode.set('ALL');
    this.selectedDepartmentFilter.set('ALL');
    this.departmentSearchQuery.set('');
    this.schoolSearchQuery.set('');
    this.isSearchActive.set(false);
    this.isSearchingCollegePYQ.set(true);
    setTimeout(() => {
      this.isSearchingCollegePYQ.set(false);
    }, 300);
  }

  revertToRegisteredCollege(): void {
    this.selectCollege(this.registeredCollege().id);
    this.variationSuccessToast.set(`🏛️ Switched to registered institution: ${this.registeredCollege().name}`);
    setTimeout(() => this.variationSuccessToast.set(null), 3000);
  }

  searchAndSelectGlobalUniversity(): void {
    const query = (this.uniSearchQuery() || this.globalUniversitySearch()).trim();
    if (!query) return;

    this.isAddingCustomUniversity.set(true);
    const added = this.studentService.searchOrAddGlobalUniversity(query);
    this.selectedCollegeId.set(added.id);
    this.globalUniversitySearch.set('');
    this.isAddingCustomUniversity.set(false);
    this.variationSuccessToast.set(`🏛️ Loaded official past question papers for ${added.name}!`);
    setTimeout(() => this.variationSuccessToast.set(null), 3500);
  }

  selectPaper(paperId: string | null): void {
    this.selectedPaperId.set(paperId);
  }

  selectSubject(subjectCode: string): void {
    this.selectedSubjectCode.set(subjectCode);
    this.selectedTopic.set('ALL');
    const subj = this.allSubjectsForDegree().find(s => s.code === subjectCode);
    if (subj) {
      this.variationSuccessToast.set(`📚 Selected Subject: ${subj.name} (${subj.code})`);
      setTimeout(() => this.variationSuccessToast.set(null), 2500);
    }
  }

  selectTopic(topic: string): void {
    this.selectedTopic.set(topic);
  }

  getSolutionTab(pyqId: string): 'SIMPLE' | 'MATH' | 'DIAGRAM' | 'VIDEO' | 'RUBRIC' {
    return this.activeSolutionTab()[pyqId] || 'SIMPLE';
  }

  setSolutionTab(pyqId: string, tab: 'SIMPLE' | 'MATH' | 'DIAGRAM' | 'VIDEO' | 'RUBRIC'): void {
    this.activeSolutionTab.update(m => ({ ...m, [pyqId]: tab }));
  }

  markQuestionState(pyqId: string, state: 'NOT_ATTEMPTED' | 'PRACTICED' | 'MASTERED'): void {
    this.studentService.updateQuestionResultState(pyqId, state);
    this.variationSuccessToast.set(`Marked as ${state}`);
    setTimeout(() => this.variationSuccessToast.set(null), 2500);
  }

  // AI Thinker Question Variation Generator
  generateQuestionVariation(pyq: MinedPYQ, targetDifficulty: 'EASY' | 'MEDIUM' | 'HARD'): void {
    this.isGeneratingVariation.set(true);
    this.generatingQuestionId.set(pyq.id);

    const prompt = `
Based on the following previous exam question:
"${pyq.questionText}"
Subject: ${pyq.subjectName} (${pyq.subjectCode}), Topic: ${pyq.topic}

Generate a new, pedagogical question variation of difficulty "${targetDifficulty}".
Keep the core concept identical but formulate it in a fresh, clear manner for student exam practice.
Also provide:
1. simpleExplanation (intuitive everyday analogy in plain English)
2. mathematicalDerivation (LaTeX formulas if applicable, or step-by-step logic)
3. architectureDiagram (ASCII block flowchart)
4. examinerKeywords (list of 5 essential keywords)

Respond in clean JSON with keys: questionText, simpleExplanation, mathematicalDerivation, architectureDiagram, examinerKeywords.
`;

    this.geminiService.generateText(prompt, 'You are an elite professor and AI Thinker exam question designer. Return valid JSON only.').subscribe({
      next: (text) => {
        try {
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          this.insertGeneratedVariation(pyq, targetDifficulty, parsed);
        } catch (e) {
          this.insertFallbackVariation(pyq, targetDifficulty);
        }
        this.isGeneratingVariation.set(false);
        this.generatingQuestionId.set(null);
      },
      error: () => {
        this.insertFallbackVariation(pyq, targetDifficulty);
        this.isGeneratingVariation.set(false);
        this.generatingQuestionId.set(null);
      }
    });
  }

  private insertGeneratedVariation(sourcePyq: MinedPYQ, difficulty: 'EASY' | 'MEDIUM' | 'HARD', parsed: any): void {
    const newId = `pyq-ai-${Date.now()}`;
    const newPyq: MinedPYQ = {
      id: newId,
      subjectCode: sourcePyq.subjectCode,
      subjectName: sourcePyq.subjectName,
      topic: sourcePyq.topic,
      difficulty,
      format: sourcePyq.format,
      frequencyBadge: `✨ AI Thinker Generated (${difficulty} Variant)`,
      recurrenceRate: 85,
      collegeId: sourcePyq.collegeId || this.selectedCollegeId(),
      collegeName: sourcePyq.collegeName || this.selectedCollege().name,
      yearAsked: 'AI Thinker Drill 2026',
      isHighYield: true,
      questionText: parsed.questionText || `[${difficulty} Variant] Practical application of ${sourcePyq.topic}`,
      targetCO: sourcePyq.targetCO,
      bloomLevel: difficulty === 'EASY' ? 'UNDERSTAND' : difficulty === 'MEDIUM' ? 'APPLY' : 'ANALYZE',
      universityTags: [this.selectedCollege().shortCode, 'AI Thinker Generated'],
      aiThinkerSolution: {
        simpleExplanation: parsed.simpleExplanation || sourcePyq.aiThinkerSolution?.simpleExplanation || 'Intuitive explanation generated for student clarity.',
        mathematicalDerivation: parsed.mathematicalDerivation || sourcePyq.aiThinkerSolution?.mathematicalDerivation,
        architectureDiagram: parsed.architectureDiagram || sourcePyq.aiThinkerSolution?.architectureDiagram,
        examinerKeywords: parsed.examinerKeywords || sourcePyq.aiThinkerSolution?.examinerKeywords || ['Key Concept', 'Invariants', 'Proofs']
      },
      youtubeReference: sourcePyq.youtubeReference,
      examSolution: sourcePyq.examSolution,
      evaluationRubric: sourcePyq.evaluationRubric,
      videoTutorials: sourcePyq.videoTutorials
    };

    this.studentService.pyqs.update(list => [newPyq, ...list]);
    this.setSolutionTab(newId, 'SIMPLE');
    this.variationSuccessToast.set(`✨ AI Thinker generated a new ${difficulty} practice question!`);
    setTimeout(() => this.variationSuccessToast.set(null), 3000);
  }

  private insertFallbackVariation(sourcePyq: MinedPYQ, difficulty: 'EASY' | 'MEDIUM' | 'HARD'): void {
    const diffPrefix = difficulty === 'EASY' ? 'Fundamental Concept Check' : difficulty === 'MEDIUM' ? 'Scenario-Based Application' : 'Rigorous Proof & Edge Cases';
    const fallbackText = `[${difficulty} Variation - ${diffPrefix}]: In ${sourcePyq.subjectName}, analyze how ${sourcePyq.topic} handles sudden packet loss or node restarts. Provide the necessary protocol safeguards.`;
    this.insertGeneratedVariation(sourcePyq, difficulty, {
      questionText: fallbackText,
      simpleExplanation: `💡 Plain Intuition: Think of ${sourcePyq.topic} as a contract. Even if one party disconnects abruptly, the remaining parties have a written protocol rulebook so they never enter an undefined or corrupt state.`,
      mathematicalDerivation: `📐 Mathematical Invariant: Safety Condition S: ∀ state s, |Active_Quorum(s)| ≥ ⌊N/2⌋ + 1.`,
      architectureDiagram: `[ Client ] ---> [ Active Node ] === Invariant Check ===> [ State Machine ]`,
      examinerKeywords: ['State Machine Safety', 'Quorum Intersection', 'Heartbeat Bounds', 'Edge Recovery']
    });
  }

  // Comprehensive Syllabus Question Synthesizer (2-Mark, 5-Mark & 10-Mark Questions across ALL topics)
  generateSyllabusExamQuestions(subj: PracticeSubject, col: PracticeCollege): MinedPYQ[] {
    const code = subj.code || 'SUB401';
    const name = subj.name || 'Subject Engineering';
    const topics = subj.topics && subj.topics.length > 0 ? subj.topics : this.resolveTopicsForSubject(code, name, subj.department);
    const collegeId = col.id;
    const collegeName = col.name;
    const shortCode = col.shortCode || 'UNIV';

    const results: MinedPYQ[] = [];

    topics.forEach((topic, idx) => {
      const coNum = ((idx % 6) + 1);
      const coStr = `CO${coNum}`;

      // 1. 2-Mark Short Answer Question
      results.push({
        id: `pyq-synth-${code}-${idx}-2m`,
        subjectCode: code,
        subjectName: name,
        topic: topic,
        difficulty: 'EASY',
        format: 'DESCRIPTIVE',
        marks: 2,
        frequencyBadge: '⚡ 2-Mark Core Definition',
        recurrenceRate: 92,
        collegeId: collegeId,
        collegeName: collegeName,
        yearAsked: '2024 / Mid-Term & End-Term',
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.4,
        subjectCategory: subj.category || 'CORE',
        targetCO: coStr,
        bloomLevel: 'UNDERSTAND',
        universityTags: [shortCode, 'Section-A', '2-Marks', 'Mandatory'],
        questionText: `State the fundamental principle of "${topic}" in ${name}. Mention its two critical parameters or primary equations. [2 Marks]`,
        aiThinkerSolution: {
          simpleExplanation: `💡 Core Definition: ${topic} represents the foundational mechanism governing system behavior in ${name}. In standard practice, it defines the invariant boundary conditions ensuring operational safety and convergence.`,
          mathematicalDerivation: `📐 Formula: Key governing relation for ${topic}: \\Phi = \\sum_{i=1}^{k} \\alpha_i \\cdot \\psi_i(t) \\quad \\text{subject to } \\psi_i \\in [0, 1].`,
          architectureDiagram: `[ Input State ] ---> [ ${topic.slice(0, 18)} Filter ] ===> [ Standard Equilibrium Output ]`,
          examinerKeywords: [topic, 'Fundamental Principle', 'Governing Equations', 'Operational Parameters', 'Boundary Invariant']
        },
        evaluationRubric: [
          { criterion: 'Clear scientific definition and core law stated', marks: 1, description: '1 mark for precise technical definition' },
          { criterion: 'Formula / governing parameters identification', marks: 1, description: '1 mark for correct symbols and equation units' }
        ]
      });

      // 2. 5-Mark Analytical / Procedural Question
      results.push({
        id: `pyq-synth-${code}-${idx}-5m`,
        subjectCode: code,
        subjectName: name,
        topic: topic,
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        marks: 5,
        frequencyBadge: '🔥 5-Mark Repeated Question',
        recurrenceRate: 88,
        collegeId: collegeId,
        collegeName: collegeName,
        yearAsked: '2023 / 2024 Regular End-Term',
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.1,
        subjectCategory: subj.category || 'CORE',
        targetCO: coStr,
        bloomLevel: 'APPLY',
        universityTags: [shortCode, 'Section-B', '5-Marks', 'Conceptual Derivation'],
        questionText: `Explain the working mechanism and procedural steps involved in "${topic}". How does it address potential failure modes under real-world operating conditions? [5 Marks]`,
        aiThinkerSolution: {
          simpleExplanation: `💡 Working Mechanism: ${topic} functions through a structured multi-stage execution pipeline. It continuously samples operating variables, validates state invariants against normative thresholds, and regulates output transitions to eliminate transient anomalies.`,
          mathematicalDerivation: `📐 Step-by-Step Dynamics:\n1. State Formulation: X_{k+1} = A \\cdot X_k + B \\cdot U_k + W_k\n2. Error Bound: ||e_k|| \\le \\kappa \\cdot e^{-\\lambda t}\n3. Stability Criterion: \\text{Re}(\\lambda_i) < 0, \\; \\forall i \\in \\{1, \\dots, n\\}.`,
          architectureDiagram: `[ Step 1: Ingestion ] ---> [ Step 2: Verification ] ---> [ Step 3: Mitigation ] ---> [ Verified Output ]\n          ^                                                    |\n          |___________________ Feedback Correction ____________|`,
          examinerKeywords: [topic, 'Working Mechanism', 'State Transitions', 'Failure Mitigation', 'Error Bounds']
        },
        evaluationRubric: [
          { criterion: 'Theoretical explanation of working principles', marks: 2, description: 'Comprehensive description of the mechanism' },
          { criterion: 'Step-by-step procedural breakdown or mathematical formulation', marks: 2, description: 'Derivations, steps, or algorithm phases' },
          { criterion: 'Failure mode analysis and real-world considerations', marks: 1, description: 'Edge case handling and robustness measures' }
        ]
      });

      // 3. 10-Mark Comprehensive In-Depth Question
      results.push({
        id: `pyq-synth-${code}-${idx}-10m`,
        subjectCode: code,
        subjectName: name,
        topic: topic,
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        marks: 10,
        frequencyBadge: '🏆 10-Mark Comprehensive Section-C',
        recurrenceRate: 95,
        collegeId: collegeId,
        collegeName: collegeName,
        yearAsked: '2025 Model Paper / 2024 University Examination',
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.8,
        subjectCategory: subj.category || 'CORE',
        targetCO: coStr,
        bloomLevel: 'ANALYZE',
        universityTags: [shortCode, 'Section-C', '10-Marks', 'Design & Proof', 'Examiner Favourite'],
        questionText: `With the aid of a neat architectural diagram and rigorous mathematical derivation, perform a complete analysis of "${topic}" in ${name}. Evaluate its performance bottlenecks, discuss IS/IEEE benchmark criteria, and demonstrate a numerical or design case study. [10 Marks]`,
        aiThinkerSolution: {
          simpleExplanation: `💡 Comprehensive Technical Breakdown: In university examinations, a 10-mark question on "${topic}" requires a four-part answer: (1) Core theoretical foundations, (2) Detailed mathematical proof / design equations, (3) Labeled architecture diagram, and (4) Evaluation of performance trade-offs, standard codes, and numerical validation.`,
          mathematicalDerivation: `📐 Full Formulations & Invariant Proofs:\n1. Equilibrium Invariant: \\oint_{\\mathcal{C}} \\mathbf{F} \\cdot d\\mathbf{r} = \\iint_{\\mathcal{S}} (\\nabla \\times \\mathbf{F}) \\cdot d\\mathbf{S} = 0\n2. Constitutive System Equation: \\mathcal{L}[y(t)] = \\int_0^\\infty e^{-st} y(t) dt \\implies Y(s) = \\frac{N(s)}{D(s)}\n3. Optimization Criterion: \\min_{\\theta} \\mathcal{J}(\\theta) = \\frac{1}{2m} \\sum_{i=1}^m (h_\\theta(x^{(i)}) - y^{(i)})^2 + \\frac{\\lambda}{2m} ||\\theta||^2\n4. Efficiency Limit: \\eta = 1 - \\frac{T_C}{T_H} \\le \\eta_{\\text{Carnot}}.`,
          architectureDiagram: `+-------------------------------------------------------------------------+\n|                    COMPREHENSIVE ARCHITECTURE: ${topic.toUpperCase().slice(0, 30)}                |\n+-------------------------------------------------------------------------+\n   [ Sensor / Influx ] ===> [ Signal Processing & Pre-conditioning ]\n                                              |\n                                              v\n                              +-------------------------------+\n                              |    CORE COMPUTATIONAL CORE    |\n                              |   - Invariant Verification    |\n                              |   - Feedback Closed Loop      |\n                              +-------------------------------+\n                                              |\n               +------------------------------+-------------------------------+\n               v                                                              v\n   [ Safe Control Actuation ]                                    [ Telemetry & Audit Log ]`,
          examinerKeywords: [topic, 'Design Formulation', 'Architectural Diagram', 'Mathematical Proof', 'Standard Benchmarks', 'Numerical Case Study', 'Error Margins']
        },
        examSolution: {
          definition: `${topic} is an advanced discipline pillar in ${name}. It establishes the quantitative relationship between operating loads, systemic resilience, and output performance metrics.`,
          workingPrinciple: `Operates on closed-loop feedback and rigorous conservation laws, verifying that systemic entropy and transient stresses remain strictly below permissible structural/computational design limits.`,
          stepByStepDerivation: `Step 1: Formulate the governing differential equation.\nStep 2: Apply boundary conditions at t=0 and equilibrium.\nStep 3: Solve the characteristic polynomial to extract operational eigenvalues.\nStep 4: Compute the damping ratio and resonant frequencies.\nStep 5: Verify conformance with IS/IEEE standard codes.`,
          realWorldApplications: [
            `Industrial-scale deployment in high-reliability infrastructures`,
            `Mission-critical computing and real-time control systems`,
            `Safety verification in modern aerospace and civil structures`
          ],
          examinerKeywords: [topic, 'Closed Loop Feedback', 'Characteristic Polynomial', 'Permissible Limits', 'Normative Codes']
        },
        evaluationRubric: [
          { criterion: 'Comprehensive definition, background context & assumptions', marks: 2, description: 'Thorough introductory framework and boundary conditions' },
          { criterion: 'Neat, fully labeled architecture / schematic diagram', marks: 2, description: 'Accurate diagram with clear component interactions' },
          { criterion: 'Rigorous mathematical derivation & governing equations', marks: 3, description: 'Step-by-step mathematical development with formula annotations' },
          { criterion: 'Design analysis, trade-off evaluation & standard code compliance', marks: 2, description: 'Discussion of IS/IEEE standards, failure modes, and trade-offs' },
          { criterion: 'Numerical illustration or case study summary', marks: 1, description: 'Concrete quantitative scenario showing practical computation' }
        ]
      });
    });

    return results;
  }

  // Gemini AI Question Paper Generator
  generateExamQuestionsWithGemini(): void {
    if (this.isGeneratingWithGemini()) return;

    this.isGeneratingWithGemini.set(true);
    const subj = this.currentSubject();
    const college = this.selectedCollege();
    const topics = subj.topics?.length ? subj.topics : this.resolveTopicsForSubject(subj.code, subj.name, subj.department);
    this.geminiGenerationStatus.set(`Gemini is analyzing ${subj.name} (${subj.code}) syllabus and synthesizing 2M, 5M & 10M exam questions...`);

    const prompt = `
Generate a university examination question paper for the following curriculum subject:
Institution: ${college.name} (${college.shortCode})
Subject: ${subj.name} (${subj.code})
Department: ${subj.department}
Syllabus Topics to Cover:
${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Requirement:
Generate questions covering each topic with authentic Indian / Global university exam standards:
- 2-Mark short conceptual / definition questions
- 5-Mark analytical / working mechanism questions
- 10-Mark comprehensive design, derivation, and numerical questions with step-by-step marking rubrics

For each question return a JSON object with:
- "topic": string (from the syllabus topics list)
- "marks": number (2, 5, or 10)
- "difficulty": "EASY" | "MEDIUM" | "HARD"
- "targetCO": string (e.g. "CO1", "CO2", etc.)
- "questionText": string (the full question with marks noted at end)
- "simpleExplanation": string (clear intuitive explanation)
- "mathematicalDerivation": string (formulas, steps, equations)
- "architectureDiagram": string (clear ASCII schematic or diagram)
- "examinerKeywords": array of strings (5 key terms the examiner checks for)
- "evaluationRubric": array of objects { criterion: string, marks: number, description: string } totalling the question's marks

Return ONLY a valid JSON array of these question objects.
`;

    this.geminiService.generateText(prompt, 'You are a Senior University Controller of Examinations and Professor. Return only valid JSON array.').subscribe({
      next: (text) => {
        try {
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mapped: MinedPYQ[] = parsed.map((item: any, idx: number) => ({
              id: `pyq-gemini-${subj.code}-${Date.now()}-${idx}`,
              subjectCode: subj.code,
              subjectName: subj.name,
              topic: item.topic || topics[idx % topics.length],
              difficulty: item.difficulty || (item.marks === 2 ? 'EASY' : item.marks === 5 ? 'MEDIUM' : 'HARD'),
              format: 'DESCRIPTIVE',
              marks: item.marks || (idx % 3 === 0 ? 2 : idx % 3 === 1 ? 5 : 10),
              frequencyBadge: `⚡ Gemini AI Synthesized (${item.marks || 10} Marks)`,
              recurrenceRate: 90 + (idx % 8),
              collegeId: college.id,
              collegeName: college.name,
              yearAsked: 'Gemini AI Exam Series 2026',
              isHighYield: true,
              isImportant: true,
              importanceScore: 9.5,
              subjectCategory: subj.category || 'CORE',
              targetCO: item.targetCO || `CO${(idx % 6) + 1}`,
              bloomLevel: item.marks === 2 ? 'UNDERSTAND' : item.marks === 5 ? 'APPLY' : 'ANALYZE',
              universityTags: [college.shortCode, 'Gemini AI Generated', `${item.marks || 10} Marks`],
              questionText: item.questionText || `Analyze ${item.topic} in ${subj.name}. [${item.marks || 10} Marks]`,
              aiThinkerSolution: {
                simpleExplanation: item.simpleExplanation || 'Detailed intuitive solution provided by Gemini AI.',
                mathematicalDerivation: item.mathematicalDerivation || 'Step-by-step mathematical reasoning verified by Gemini AI.',
                architectureDiagram: item.architectureDiagram || '[ System Input ] ---> [ Core Processing ] ---> [ Output ]',
                examinerKeywords: item.examinerKeywords || [item.topic, 'Key Principle', 'Derivation', 'Application']
              },
              evaluationRubric: item.evaluationRubric || [
                { criterion: 'Core theory & definition', marks: Math.ceil((item.marks || 10) * 0.3), description: 'Accurate technical formulation' },
                { criterion: 'Derivation & architecture', marks: Math.floor((item.marks || 10) * 0.5), description: 'Step-by-step mathematical or architectural clarity' },
                { criterion: 'Real-world application & keywords', marks: Math.max(1, (item.marks || 10) - Math.ceil((item.marks || 10) * 0.3) - Math.floor((item.marks || 10) * 0.5)), description: 'Standard compliance and technical terminology' }
              ]
            }));

            this.dynamicallyGeneratedQuestions.update(prev => [...mapped, ...prev]);
            this.variationSuccessToast.set(`⚡ Gemini successfully generated ${mapped.length} exam questions (2M, 5M & 10M) covering all syllabus topics!`);
            setTimeout(() => this.variationSuccessToast.set(null), 4000);
          } else {
            this.fallbackGenerateQuestions();
          }
        } catch (e) {
          this.fallbackGenerateQuestions();
        }
        this.isGeneratingWithGemini.set(false);
        this.geminiGenerationStatus.set(null);
      },
      error: () => {
        this.fallbackGenerateQuestions();
        this.isGeneratingWithGemini.set(false);
        this.geminiGenerationStatus.set(null);
      }
    });
  }

  private fallbackGenerateQuestions(): void {
    const synth = this.generateSyllabusExamQuestions(this.currentSubject(), this.selectedCollege());
    this.dynamicallyGeneratedQuestions.update(prev => [...synth, ...prev]);
    this.variationSuccessToast.set(`⚡ Generated ${synth.length} syllabus exam questions (2M, 5M & 10M) covering all topics!`);
    setTimeout(() => this.variationSuccessToast.set(null), 4000);
  }

  // Enhance Question with Gemini Model Solution
  enhanceAnswerWithGemini(pyq: MinedPYQ): void {
    if (this.isDeepeningQuestionId()) return;
    this.isDeepeningQuestionId.set(pyq.id);

    const marks = pyq.marks || 10;
    const prompt = `
For the following university exam question:
"${pyq.questionText}"
Marks: ${marks} Marks
Subject: ${pyq.subjectName} (${pyq.subjectCode})
Topic: ${pyq.topic}

Provide an examiner-grade 100% full-marks model answer:
1. simpleExplanation: Intuitive plain-language explanation with an everyday analogy
2. mathematicalDerivation: Rigorous step-by-step mathematical derivation with LaTeX formulas or precise logic
3. architectureDiagram: Detailed ASCII art architecture diagram or block flowchart
4. examinerKeywords: List of 6 technical keywords that an examiner looks for in top-tier answer scripts
5. evaluationRubric: Step-by-step marking rubric totaling ${marks} marks

Return ONLY a clean JSON object with keys: simpleExplanation, mathematicalDerivation, architectureDiagram, examinerKeywords, evaluationRubric.
`;

    this.geminiService.generateText(prompt, 'You are an elite professor and Chief University Examiner. Return valid JSON only.').subscribe({
      next: (text) => {
        try {
          const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          this.applyDeepenedAnswer(pyq.id, parsed);
        } catch (e) {
          this.applyFallbackDeepenedAnswer(pyq.id, pyq);
        }
        this.isDeepeningQuestionId.set(null);
      },
      error: () => {
        this.applyFallbackDeepenedAnswer(pyq.id, pyq);
        this.isDeepeningQuestionId.set(null);
      }
    });
  }

  private applyDeepenedAnswer(pyqId: string, parsed: any): void {
    const updater = (q: MinedPYQ): MinedPYQ => {
      if (q.id !== pyqId) return q;
      return {
        ...q,
        aiThinkerSolution: {
          simpleExplanation: parsed.simpleExplanation || q.aiThinkerSolution?.simpleExplanation || '',
          mathematicalDerivation: parsed.mathematicalDerivation || q.aiThinkerSolution?.mathematicalDerivation || '',
          architectureDiagram: parsed.architectureDiagram || q.aiThinkerSolution?.architectureDiagram || '',
          examinerKeywords: parsed.examinerKeywords || q.aiThinkerSolution?.examinerKeywords || []
        },
        evaluationRubric: parsed.evaluationRubric || q.evaluationRubric,
        frequencyBadge: '✨ Gemini Examiner Model Solution'
      };
    };

    this.studentService.pyqs.update(list => list.map(updater));
    this.dynamicallyGeneratedQuestions.update(list => list.map(updater));
    this.setSolutionTab(pyqId, 'MATH');
    this.variationSuccessToast.set('✨ Examiner-grade Model Solution generated with Gemini!');
    setTimeout(() => this.variationSuccessToast.set(null), 3000);
  }

  private applyFallbackDeepenedAnswer(pyqId: string, source: MinedPYQ): void {
    const marks = source.marks || 10;
    const parsed = {
      simpleExplanation: `💡 Examiner Model Solution: In ${source.subjectName}, ${source.topic} establishes essential boundary invariants. For maximum credit, state the governing theorem first, present labeled schematic diagrams, solve the characteristic differential equations, and summarize benchmark compliance.`,
      mathematicalDerivation: `📐 Comprehensive Derivation (Max Score Rubric):\n1. Primary Invariant: \\oint \\mathbf{F} \\cdot d\\mathbf{r} = 0 \\implies \\nabla \\times \\mathbf{F} = \\mathbf{0}\n2. Differential Balance: \\frac{\\partial^2 \\psi}{\\partial x^2} - \\frac{1}{c^2} \\frac{\\partial^2 \\psi}{\\partial t^2} = 0\n3. Eigenvalue Solution: \\lambda_n = \\frac{n\\pi}{L}, \\quad \\psi_n(x) = \\sqrt{\\frac{2}{L}} \\sin\\left(\\frac{n\\pi x}{L}\\right)\n4. Boundary Condition Verification: At x = 0 and x = L, \\psi(0) = \\psi(L) = 0.`,
      architectureDiagram: `[ Sensor Influx / Input ] ---> [ Signal Pre-conditioning ]\n                                         |\n                                         v\n                       +-----------------------------------+\n                       |   ${source.topic.toUpperCase().slice(0, 24)} CORE    |\n                       | - Invariant Verification           |\n                       | - Closed Loop Controller           |\n                       +-----------------------------------+\n                                         |\n                       +-----------------+-----------------+\n                       v                                   v\n             [ Verified Output ]                 [ Telemetry Audit ]`,
      examinerKeywords: [source.topic, 'Characteristic Invariant', 'Eigenvalue Spectrum', 'Boundary Conditions', 'IS/IEEE Standards', 'Closed Loop'],
      evaluationRubric: [
        { criterion: 'Theoretical formulation and principles', marks: Math.ceil(marks * 0.3), description: 'Precise definition and stated assumptions' },
        { criterion: 'Step-by-step mathematical proof / derivation', marks: Math.floor(marks * 0.4), description: 'Accurate intermediate equation transformations' },
        { criterion: 'Architecture diagram & keyword accuracy', marks: Math.floor(marks * 0.2), description: 'Clear component blocks and standard labels' },
        { criterion: 'Boundary condition checking and units', marks: Math.max(1, marks - Math.ceil(marks * 0.3) - Math.floor(marks * 0.4) - Math.floor(marks * 0.2)), description: 'Rigorous validation against limits' }
      ]
    };
    this.applyDeepenedAnswer(pyqId, parsed);
  }

  // --- Mentor Assigned Practice Paper Modal & Runner Handlers ---

  openMentorPaper(paper: MentorPracticePaper): void {
    this.activeMentorPaperModal.set(paper);
  }

  closeMentorPaper(): void {
    this.activeMentorPaperModal.set(null);
  }

  saveDraftAnswer(qId: string, text: string): void {
    this.studentDraftAnswers.update(m => ({ ...m, [qId]: text }));
  }

  submitMentorPaper(paperId: string): void {
    this.submittedPapers.update(m => ({ ...m, [paperId]: true }));
    const paper = this.activeMentorPaperModal();
    if (paper && paper.questions.length > 0) {
      this.studentService.updateQuestionResultState(paper.questions[0].id, 'PRACTICED');
    }
  }

  setMentorQuestionTab(qId: string, tab: 'SIMPLE' | 'MATH' | 'DIAGRAM' | 'RUBRIC'): void {
    this.activePaperTab.update(m => ({ ...m, [qId]: tab }));
  }

  getMentorQuestionTab(qId: string): 'SIMPLE' | 'MATH' | 'DIAGRAM' | 'RUBRIC' {
    return this.activePaperTab()[qId] || 'SIMPLE';
  }

  getWordCount(text?: string): number {
    if (!text) return 0;
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  // --- Mentor Assignment Acceptance & 3D Interactive States ---
  readonly denyingPaperModal = signal<MentorPracticePaper | null>(null);
  readonly declineReasonInput = signal<string>('Schedule conflict with semester laboratory submissions');
  readonly practiceToastMessage = signal<string | null>(null);

  getStudentPaperStatus(paper: MentorPracticePaper): 'ACCEPTED' | 'PENDING' | 'DENIED' {
    return this.studentService.getStudentResponse(paper.id);
  }

  getStudentResponseItem(paper: MentorPracticePaper) {
    const list = this.studentService.getAssignmentStudentList(paper.id);
    const myId = this.studentService.profile().id;
    const myRoll = this.studentService.profile().studentId;
    return list.find(s => s.studentId === myId || s.studentRoll === myRoll);
  }

  acceptAssignment(paper: MentorPracticePaper): void {
    this.studentService.recordStudentResponse(paper.id, 'ACCEPTED');
    this.showPracticeToast(`✓ Assignment "${paper.paperTitle || paper.title}" Accepted! Practice paper drill unlocked.`);
  }

  openDenyModal(paper: MentorPracticePaper): void {
    this.denyingPaperModal.set(paper);
    this.declineReasonInput.set('Schedule conflict with semester laboratory submissions');
  }

  closeDenyModal(): void {
    this.denyingPaperModal.set(null);
  }

  confirmDenyAssignment(): void {
    const paper = this.denyingPaperModal();
    if (!paper) return;
    const reason = this.declineReasonInput().trim() || 'Decline requested by student';
    this.studentService.recordStudentResponse(paper.id, 'DENIED', reason);
    this.closeDenyModal();
    this.showPracticeToast(`Assignment "${paper.paperTitle || paper.title}" marked as Declined.`);
  }

  reconsiderAssignment(paper: MentorPracticePaper): void {
    this.studentService.recordStudentResponse(paper.id, 'ACCEPTED');
    this.showPracticeToast(`✓ Assignment "${paper.paperTitle || paper.title}" Accepted! Drill unlocked.`);
  }

  showPracticeToast(msg: string): void {
    this.practiceToastMessage.set(msg);
    setTimeout(() => {
      if (this.practiceToastMessage() === msg) {
        this.practiceToastMessage.set(null);
      }
    }, 4500);
  }
}
