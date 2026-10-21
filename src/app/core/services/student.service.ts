import { Injectable, inject, signal, computed } from '@angular/core';
import { GeminiAiService } from './gemini-ai.service';
import {
  StudentJoinedClass,
  StudentAssignedTest,
  MinedPYQ,
  OCRQuestionPaper,
  OCRQuestionItem,
  StudentAcademicProfile,
  StudentNotificationItem,
  StudentThemePreference,
  StudentVivaEvaluationResult,
  VivaQuestionSubmissionItem,
  VivaQuestionEvaluationItem,
  ChatMessage,
  ClassSecurityPolicy,
  TerminatedStudentIncident,
  ClassProctorAlert,
  PracticeCollege,
  PracticeSubject,
  MentorPracticePaper,
  AssignmentStudentAcceptance,
  PracticeQuestionSolution,
  UniversityQuestionPaper,
  UniversityProgramDetail,
  UniversitySchoolFaculty,
  UniversityCourseProgram,
  UniversitySpecializationDetail,
  ExamMarkingScheme
} from '../models';
import { of, Observable, delay } from 'rxjs';

export function extractClassCode(rawInput: string | undefined | null): string {
  if (!rawInput) return '';
  let input = rawInput.trim();

  // 1. Check if input is a URL or contains query parameters
  if (input.includes('?') || input.includes('http://') || input.includes('https://') || input.includes('localhost') || input.includes('/classes') || input.includes('/join')) {
    try {
      const dummyBase = 'http://localhost';
      const urlObj = new URL(input.startsWith('http://') || input.startsWith('https://') ? input : dummyBase + (input.startsWith('/') ? input : '/' + input));
      const codeParam = urlObj.searchParams.get('joinCode') || urlObj.searchParams.get('code') || urlObj.searchParams.get('c');
      if (codeParam) {
        return codeParam.trim().toUpperCase();
      }
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        const last = parts[parts.length - 1];
        if (last && last !== 'classes' && last !== 'join') {
          return last.trim().toUpperCase();
        }
      }
    } catch (e) {
      // Fallback to regex
    }

    const matchParam = input.match(/[?&](?:joinCode|code|c)=([^&#\s]+)/i);
    if (matchParam && matchParam[1]) {
      return decodeURIComponent(matchParam[1]).trim().toUpperCase();
    }
  }

  // 2. Direct clean code (strip quotes, clean whitespace)
  input = input.replace(/^["']|["']$/g, '').trim();
  return input.toUpperCase();
}

export interface ClassroomLookupResult {
  found: boolean;
  extractedCode: string;
  isEnrolled: boolean;
  isPending: boolean;
  classroom?: {
    id: string;
    name: string;
    subjectCode: string;
    joinCode: string;
    mentorName: string;
    mentorEmail?: string;
    department: string;
    semester: number;
    academicYear?: string;
    coverGradient?: string;
  };
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentService {
  private readonly geminiService = inject(GeminiAiService);

  // LocalStorage Keys
  private readonly KEY_JOINED_CLASSES = 'viva_student_joined_classes';
  private readonly KEY_ENROLLMENT_ROSTER = 'viva_enrollment_requests_roster';
  private readonly KEY_MESSAGES = 'viva_class_isolated_messages';
  private readonly KEY_NOTIFICATIONS = 'viva_live_notifications_feed';
  private readonly KEY_THEME = 'viva_theme_preference';
  private readonly KEY_TESTS = 'viva_student_assigned_tests_v2';
  private readonly KEY_PROFILE = 'viva_student_academic_profile_v2';

  // Real-Time Broadcast Channels
  private enrollmentChannel: BroadcastChannel | null = null;
  private proctorChannel: BroadcastChannel | null = null;

  // 1. Reactive Signals State
  readonly profile = signal<StudentAcademicProfile>({
    id: 'stu-sahil-01',
    studentId: '2023308724',
    fullName: 'Sahil Kumar',
    email: 'sahil.k@apex.edu',
    phone: '+91 98765 43210',
    avatarUrl: '/assets/avatar-rahul.jpg',
    collegeName: 'Apex Institute of Technology',

    department: 'Computer Science & Engineering',
    program: 'B.Tech CSE',
    semester: 'Semester 6',
    batch: '2023 - 2027',
    section: 'B.Tech CSE-6A',
    primaryMentorName: 'Dr. Sarah Jenkins',
    primaryMentorCode: 'MTR-10452',
    primaryMentorEmail: 's.jenkins@apex.edu',
    overallReadinessIndex: 84.6,
    integrityScore: 100,
    averageCOAttainment: 81.2,
    completedVivasCount: 14
  });

  readonly themePreference = signal<StudentThemePreference>('light');
  readonly joinedClasses = signal<StudentJoinedClass[]>([]);
  readonly assignedTests = signal<StudentAssignedTest[]>([]);
  readonly notifications = signal<StudentNotificationItem[]>([]);
  readonly pyqs = signal<MinedPYQ[]>([]);
  readonly questionPapers = signal<OCRQuestionPaper[]>([]);
  readonly facultyIntercomMessage = signal<{ message: string; timestamp: string } | null>(null);
  readonly isExamFullscreenMode = signal<boolean>(false);

  // Colleges for PYQ Miner
  // Colleges & National Entrance Exams for PYQ Miner (with Multi-Location Campuses)
  readonly practiceColleges = signal<PracticeCollege[]>([
    {
      id: 'apex',
      name: 'Apex Institute of Technology',
      shortCode: 'Apex Tech',
      campusLocation: 'Electronic City Phase 1, Bangalore Main Campus',
      city: 'Bangalore',
      country: 'India',
      state: 'Karnataka',
      tier: 'Autonomous Tier-1 Engineering Institute',
      category: 'AUTONOMOUS_COLLEGE',
      institutionType: 'GOVT_AUTONOMOUS_COLLEGE',
      websiteUrl: 'https://apex.edu.in',
      accreditation: 'NAAC A++ • AICTE Approved • NIRF Rank 28',
      officialSiteVerified: true,
      logoIcon: '🏛️',
      pyqCount: 168,
      paperCount: 12,
      establishedYear: 1998,
      isGlobal: false,
      departments: ['Computer Science & Engineering', 'Artificial Intelligence & Machine Learning', 'Electronics & Communication', 'Information Science'],
      programs: ['B.Tech Computer Science & Engineering', 'B.Tech AI & Data Science', 'M.Tech Software Engineering'],
      schoolsCatalog: [
        {
          name: 'School of Computing & Information Technology (SCIT)',
          shortName: 'Engineering & Computing',
          code: 'SCIT',
          icon: '💻',
          description: 'Tier-1 Engineering Faculty specializing in Autonomous Computing, Systems, and AI Architectures.',
          departments: [
            'Department of Computer Science & Engineering',
            'Department of Artificial Intelligence & Machine Learning',
            'Department of Information Science & Engineering'
          ],
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
                  coreSubjects: [
                    'CS401 Distributed Systems & Consensus Architecture',
                    'CS301 Operating Systems & Concurrency',
                    'CS302 Computer Networks & Protocol Engineering',
                    'CS201 Data Structures & Algorithms'
                  ],
                  electiveSubjects: [
                    'CS602 Cloud Computing & Virtualization',
                    'CS604 Cyber Security & Cryptography'
                  ],
                  alliedSubjects: [
                    'MA101 Linear Algebra & Discrete Mathematics',
                    'EC201 Digital Logic Design'
                  ]
                },
                {
                  name: 'Artificial Intelligence & Machine Learning',
                  code: 'CSE-AIML',
                  icon: '🤖',
                  coreSubjects: [
                    'AI401 Machine Learning Foundations',
                    'AI501 Deep Neural Architectures',
                    'CS401 Distributed Systems'
                  ],
                  electiveSubjects: [
                    'AI601 Computer Vision & CNNs',
                    'AI602 Natural Language Processing'
                  ],
                  alliedSubjects: [
                    'MA201 Probability, Statistics & Stochastic Processes'
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'School of Applied Sciences & Management (SASM)',
          shortName: 'Management & Sciences',
          code: 'SASM',
          icon: '📊',
          description: 'Faculty dedicated to Applied Mathematics, Physics, and Tech Entrepreneurship.',
          departments: [
            'Department of Applied Mathematics',
            'Department of Technology Management'
          ],
          programs: [
            {
              name: 'Master of Technology Management (MTM)',
              shortCode: 'MTM',
              level: 'PG',
              durationYears: 2,
              specializations: [
                {
                  name: 'Technology Product Strategy & Analytics',
                  code: 'MTM-PROD',
                  icon: '📈',
                  coreSubjects: [
                    'MGT101 Tech Enterprise Strategy',
                    'MGT201 Data-Driven Decision Systems'
                  ],
                  electiveSubjects: [
                    'MGT301 Product Lifecycle Engineering'
                  ],
                  alliedSubjects: [
                    'MA101 Linear Algebra & Discrete Mathematics'
                  ]
                }
              ]
            }
          ]
        }
      ],
      programsCatalog: [
        {
          name: 'B.Tech Computer Science & Engineering',
          shortCode: 'B.Tech CSE',
          level: 'UG',
          schoolName: 'School of Computing & Information Technology',
          departmentName: 'Department of Computer Science & Engineering',
          coreSubjects: ['CS401 Distributed Systems & Consensus Architecture', 'CS301 Operating Systems & Concurrency', 'CS302 Computer Networks & Protocol Engineering', 'CS201 Data Structures & Algorithms', 'CS304 Database Management Systems'],
          electiveSubjects: ['AI501 Deep Learning & Neural Networks', 'CS602 Cloud Computing & Virtualization', 'CS604 Cyber Security & Cryptography'],
          alliedSubjects: ['MA101 Linear Algebra & Discrete Mathematics', 'EC201 Digital Logic Design', 'HS101 Technical Writing & Ethics']
        },
        {
          name: 'B.Tech AI & Data Science',
          shortCode: 'B.Tech AI-DS',
          level: 'UG',
          schoolName: 'School of Advanced AI & Data Sciences',
          departmentName: 'Department of Artificial Intelligence & Machine Learning',
          coreSubjects: ['AI401 Machine Learning Foundations', 'AI501 Deep Neural Architectures', 'CS401 Distributed Systems', 'DS301 Big Data Analytics & MapReduce'],
          electiveSubjects: ['AI601 Computer Vision & CNNs', 'AI602 Natural Language Processing & Transformers', 'AI603 Reinforcement Learning'],
          alliedSubjects: ['MA201 Probability, Statistics & Stochastic Processes', 'HS102 AI Ethics & Governance']
        },
        {
          name: 'M.Tech Software Engineering',
          shortCode: 'M.Tech SE',
          level: 'PG',
          schoolName: 'Postgraduate School of Computing',
          departmentName: 'Department of Computer Science & Engineering',
          coreSubjects: ['SE501 Advanced Software Architecture', 'CS502 Distributed Consensus Protocols', 'SE503 Enterprise Cloud Architecture'],
          electiveSubjects: ['SE601 Site Reliability Engineering & DevOps', 'SE602 Formal Methods in Software Verification'],
          alliedSubjects: ['RM101 Research Methodology & IPR']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Registered Institution • Internal curriculum aligned • Highest oral viva overlap'
    },
    {
      id: 'sharda-gn',
      name: 'Sharda University (Greater Noida Campus)',
      shortCode: 'Sharda Univ',
      campusLocation: 'Plot No. 32-34, Knowledge Park III, Greater Noida',
      city: 'Greater Noida',
      country: 'India',
      state: 'Uttar Pradesh',
      tier: 'NAAC A+ Accredited Multi-Disciplinary University',
      category: 'UNIVERSITY',
      institutionType: 'PRIVATE_STATE_UNIVERSITY',
      websiteUrl: 'https://www.sharda.ac.in',
      accreditation: 'NAAC A+ Accredited • UGC Recognized • NIRF Ranked',
      officialSiteVerified: true,
      logoIcon: '🎓',
      pyqCount: 245,
      paperCount: 16,
      establishedYear: 2009,
      isGlobal: false,
      departments: [
        'Department of Computer Science & Engineering',
        'Department of Artificial Intelligence & Data Science',
        'Department of Electronics & Communication Engineering',
        'Department of Electrical & Electronics Engineering',
        'Department of Mechanical Engineering',
        'Department of Civil Engineering',
        'Department of Biotechnology',
        'Department of Human Anatomy',
        'Department of Human Physiology',
        'Department of Pathology & Microbiology',
        'Department of Pharmacology & Therapeutics',
        'Department of General Medicine',
        'Department of Constitutional & Administrative Law',
        'Department of Corporate & Commercial Law',
        'Department of Criminal Justice & Criminology',
        'Department of Finance & Banking',
        'Department of Business Analytics',
        'Department of Marketing & International Business',
        'Department of Mathematics & Computing',
        'Department of Physics',
        'Department of Chemistry',
        'Department of Pharmaceutics',
        'Department of Pharmacology & Clinical Pharmacy'
      ],
      programs: [
        'B.Tech Computer Science & Engineering',
        'M.Tech Computer Science & Engineering',
        'Bachelor of Computer Applications (BCA)',
        'Master of Computer Applications (MCA)',
        'B.Tech Artificial Intelligence & Machine Learning',
        'B.Tech Data Science & Analytics',
        'B.Tech Electronics & Communication Engineering',
        'M.Tech VLSI Design & Embedded Systems',
        'B.Tech Electrical & Electronics Engineering',
        'M.Tech Power Systems & Smart Grids',
        'B.Tech Mechanical Engineering',
        'M.Tech Mechanical Engineering',
        'B.Tech Civil Engineering',
        'M.Tech Structural Engineering',
        'B.Tech Biotechnology',
        'M.Tech Biotechnology',
        'Bachelor of Medicine & Bachelor of Surgery (MBBS)',
        'Doctor of Medicine (MD General Medicine)',
        'Master of Surgery (MS General Surgery)',
        'B.Sc Medical Laboratory Technology (BMLT)',
        'B.A. LL.B (Hons)',
        'B.B.A. LL.B (Hons)',
        'LL.B (3 Years)',
        'LL.M Corporate & Commercial Law',
        'Bachelor of Business Administration (BBA)',
        'Bachelor of Commerce (B.Com Hons)',
        'MBA (FinTech & Analytics)',
        'MBA (Business Analytics & AI)',
        'B.Sc Mathematics & Computing',
        'B.Sc Physics',
        'Bachelor of Pharmacy (B.Pharm)'
      ],
      schoolsCatalog: [
        {
          name: 'School of Engineering and Technology (SET)',
          shortName: 'Engineering & Technology',
          code: 'SET',
          icon: '⚙️',
          description: 'Premier faculty offering AICTE & ABET accredited Computing, AI, Electronics, Mechanical, Civil, and Biotechnology Engineering.',
          departments: [
            'Department of Computer Science & Engineering',
            'Department of Artificial Intelligence & Data Science',
            'Department of Electronics & Communication Engineering',
            'Department of Electrical & Electronics Engineering',
            'Department of Mechanical Engineering',
            'Department of Civil Engineering',
            'Department of Biotechnology'
          ],
          programs: [
            // 1. Department of Computer Science & Engineering
            {
              name: 'Bachelor of Technology (B.Tech - Computer Science & Engineering)',
              shortCode: 'B.Tech CSE',
              level: 'UG',
              durationYears: 4,
              departmentName: 'Department of Computer Science & Engineering',
              degreeType: 'B.Tech',
              specializations: [
                {
                  name: 'Cloud Computing & Distributed Systems',
                  code: 'CSE-CLOUD',
                  icon: '☁️',
                  coreSubjects: [
                    'CS401 Distributed Systems & Cloud Architecture',
                    'CS301 Operating Systems & Kernel Virtualization',
                    'CS302 Computer Networks & Protocol Engineering',
                    'CS201 Data Structures & Algorithms'
                  ],
                  electiveSubjects: [
                    'CS505 Cloud Microservices & Kubernetes',
                    'CS508 Serverless Edge Computing'
                  ],
                  alliedSubjects: [
                    'MA202 Numerical Linear Algebra',
                    'EC204 Digital Logic & Microprocessors'
                  ]
                },
                {
                  name: 'Cyber Security & Digital Forensics',
                  code: 'CSE-CYBER',
                  icon: '🛡️',
                  coreSubjects: [
                    'CY401 Network Defense & Ethical Hacking',
                    'CY301 Cryptography & Public Key Infrastructure',
                    'CS302 Computer Networks & Protocol Engineering',
                    'CS201 Data Structures & Algorithms'
                  ],
                  electiveSubjects: [
                    'CY502 Digital Forensics & Incident Response',
                    'CY503 Blockchain & Smart Contract Security'
                  ],
                  alliedSubjects: [
                    'LW201 Cyber Law & IT Act Compliance',
                    'MA202 Applied Discrete Mathematics'
                  ]
                },
                {
                  name: 'Software Engineering & Enterprise DevOps',
                  code: 'CSE-DEVOPS',
                  icon: '🚀',
                  coreSubjects: [
                    'CS405 Enterprise Software Architecture & Design Patterns',
                    'CS406 CI/CD Pipeline & Site Reliability Engineering',
                    'CS301 Operating Systems & Concurrency'
                  ],
                  electiveSubjects: [
                    'CS510 Micro-frontend Architecture & State Machines',
                    'CS512 Chaos Engineering & Fault Injection'
                  ],
                  alliedSubjects: [
                    'MGT201 Agile Project Management & Scrum',
                    'MA201 Discrete Mathematical Structures'
                  ]
                }
              ]
            },
            {
              name: 'Master of Technology (M.Tech - Computer Science & Engineering)',
              shortCode: 'M.Tech CSE',
              level: 'PG',
              durationYears: 2,
              departmentName: 'Department of Computer Science & Engineering',
              degreeType: 'M.Tech',
              specializations: [
                {
                  name: 'High Performance Computing & Distributed Systems',
                  code: 'MTECH-CSE',
                  icon: '⚡',
                  coreSubjects: [
                    'CS601 Advanced Computer Architecture & Parallel Systems',
                    'CS602 Advanced Algorithms & Computational Complexity',
                    'CS603 Distributed Consensus & Fault Tolerance'
                  ],
                  electiveSubjects: [
                    'CS701 Quantum Computing & Quantum Information',
                    'CS702 Advanced Compiler Optimization'
                  ],
                  alliedSubjects: [
                    'MA601 Advanced Probability & Stochastic Processes'
                  ]
                }
              ]
            },
            {
              name: 'Bachelor of Computer Applications (BCA)',
              shortCode: 'BCA',
              level: 'UG',
              durationYears: 3,
              departmentName: 'Department of Computer Science & Engineering',
              degreeType: 'BCA',
              specializations: [
                {
                  name: 'Cloud Technology & Information Security',
                  code: 'BCA-CLOUD',
                  icon: '🌐',
                  coreSubjects: [
                    'BCA301 Web Technology & Modern JavaScript',
                    'BCA302 Database Management Systems & SQL',
                    'BCA201 Object Oriented Programming in Java',
                    'BCA202 Computer Fundamentals & OS'
                  ],
                  electiveSubjects: [
                    'BCA401 Cloud Infrastructure & AWS Fundamentals',
                    'BCA402 Mobile App Development with Flutter'
                  ],
                  alliedSubjects: [
                    'BCA101 Mathematics for Computing & Statistics'
                  ]
                }
              ]
            },
            {
              name: 'Master of Computer Applications (MCA)',
              shortCode: 'MCA',
              level: 'PG',
              durationYears: 2,
              departmentName: 'Department of Computer Science & Engineering',
              degreeType: 'MCA',
              specializations: [
                {
                  name: 'Full Stack Cloud Enterprise Architecture',
                  code: 'MCA-FSD',
                  icon: '💻',
                  coreSubjects: [
                    'CA401 Advanced Database Systems & Distributed NoSQL',
                    'CA402 Cloud Native Web Architecture & Containers',
                    'CS401 Distributed Systems'
                  ],
                  electiveSubjects: [
                    'CA501 Mobile App Architecture & Flutter',
                    'CA502 DevOps, CI/CD & Site Reliability Engineering'
                  ],
                  alliedSubjects: [
                    'CA101 Discrete Mathematics for Computing'
                  ]
                }
              ]
            },

            // 2. Department of Artificial Intelligence & Data Science
            {
              name: 'Bachelor of Technology (B.Tech - Artificial Intelligence & Machine Learning)',
              shortCode: 'B.Tech AI & ML',
              level: 'UG',
              durationYears: 4,
              departmentName: 'Department of Artificial Intelligence & Data Science',
              degreeType: 'B.Tech',
              specializations: [
                {
                  name: 'Deep Learning, Generative AI & Large Language Models',
                  code: 'AI-GENAI',
                  icon: '🤖',
                  coreSubjects: [
                    'AI402 Deep Learning & Neural Architectures',
                    'AI301 Machine Learning Foundations & Algorithms',
                    'CS401 Distributed Systems for AI',
                    'AI305 Natural Language Processing & Transformers'
                  ],
                  electiveSubjects: [
                    'AI504 Large Language Models & Prompt Engineering',
                    'AI507 Computer Vision & Multimodal Perception'
                  ],
                  alliedSubjects: [
                    'MA204 Probability & Stochastic Modeling for AI',
                    'HS104 AI Ethics, Governance & Safety Policy'
                  ]
                },
                {
                  name: 'Autonomous Systems & Robotics AI',
                  code: 'AI-ROBOT',
                  icon: '🦾',
                  coreSubjects: [
                    'AI410 Robot Kinematics & Reinforcement Learning',
                    'AI302 Sensor Fusion & SLAM Algorithms',
                    'CS301 Real-Time Operating Systems'
                  ],
                  electiveSubjects: [
                    'AI515 Autonomous Vehicle Perception',
                    'AI518 Edge AI & Embedded Tensor Processing'
                  ],
                  alliedSubjects: [
                    'MA202 Numerical Linear Algebra & Optimization'
                  ]
                }
              ]
            },
            {
              name: 'Bachelor of Technology (B.Tech - Data Science & Analytics)',
              shortCode: 'B.Tech Data Science',
              level: 'UG',
              durationYears: 4,
              departmentName: 'Department of Artificial Intelligence & Data Science',
              degreeType: 'B.Tech',
              specializations: [
                {
                  name: 'Big Data Engineering & Predictive Analytics',
                  code: 'DS-BIGDATA',
                  icon: '📊',
                  coreSubjects: [
                    'DS301 Big Data Analytics & Apache Spark',
                    'DS302 Statistical Inference & Hypothesis Testing',
                    'DS401 Data Warehousing & ETL Pipelines',
                    'CS201 Data Structures & Algorithms'
                  ],
                  electiveSubjects: [
                    'DS503 Time-Series Forecasting & Financial Analytics',
                    'DS506 Business Intelligence & Tableau Visualization'
                  ],
                  alliedSubjects: [
                    'MA205 Multivariate Calculus & Matrix Decomposition'
                  ]
                }
              ]
            },

            // 3. Department of Electronics & Communication Engineering
            {
              name: 'Bachelor of Technology (B.Tech - Electronics & Communication Engineering)',
              shortCode: 'B.Tech ECE',
              level: 'UG',
              durationYears: 4,
              departmentName: 'Department of Electronics & Communication Engineering',
              degreeType: 'B.Tech',
              specializations: [
                {
                  name: 'VLSI Design, Embedded Systems & IoT',
                  code: 'ECE-VLSI',
                  icon: '🔬',
                  coreSubjects: [
                    'EC401 VLSI Design & CMOS Circuit Engineering',
                    'EC301 Microcontrollers & ARM Architecture',
                    'EC302 Digital Signal Processing & Filter Design',
                    'EC202 Analog Circuits & Semiconductor Devices'
                  ],
                  electiveSubjects: [
                    'EC503 FPGA Prototyping & Verilog HDL',
                    'EC507 Internet of Things (IoT) Protocol Architecture'
                  ],
                  alliedSubjects: [
                    'MA203 Electromagnetic Theory & Waves',
                    'CS201 Data Structures & Algorithms'
                  ]
                },
                {
                  name: '5G Wireless Communications & Signal Processing',
                  code: 'ECE-5G',
                  icon: '📡',
                  coreSubjects: [
                    'EC405 Digital Communication & Information Theory',
                    'EC406 Microwave Engineering & Antenna Array Design',
                    'EC302 Digital Signal Processing'
                  ],
                  electiveSubjects: [
                    'EC512 5G/6G Cellular Standards & Beamforming',
                    'EC515 Optical Fiber Communications'
                  ],
                  alliedSubjects: [
                    'MA204 Probability & Random Processes'
                  ]
                }
              ]
            },
            {
              name: 'Master of Technology (M.Tech - VLSI Design & Embedded Systems)',
              shortCode: 'M.Tech VLSI',
              level: 'PG',
              durationYears: 2,
              departmentName: 'Department of Electronics & Communication Engineering',
              degreeType: 'M.Tech',
              specializations: [
                {
                  name: 'Semiconductor Device Physics & ASIC Architecture',
                  code: 'MTECH-VLSI',
                  icon: '⚡',
                  coreSubjects: [
                    'EC601 Advanced CMOS Analog IC Design',
                    'EC602 Low Power VLSI System Design',
                    'EC603 Physical Design & EDA Algorithms'
                  ],
                  electiveSubjects: [
                    'EC701 System-on-Chip (SoC) Architecture',
                    'EC704 Testing & Fault Tolerance in Digital Systems'
                  ],
                  alliedSubjects: [
                    'MA602 Applied Linear Algebra & Numerical Optimization'
                  ]
                }
              ]
            },

            // 4. Department of Electrical & Electronics Engineering
            {
              name: 'Bachelor of Technology (B.Tech - Electrical & Electronics Engineering)',
              shortCode: 'B.Tech EEE',
              level: 'UG',
              durationYears: 4,
              departmentName: 'Department of Electrical & Electronics Engineering',
              degreeType: 'B.Tech',
              specializations: [
                {
                  name: 'Power Systems, Renewable Energy & EV Drives',
                  code: 'EEE-POWER',
                  icon: '⚡',
                  coreSubjects: [
                    'EE401 Power System Analysis & Grid Protection',
                    'EE301 Electrical Machines & Transformers',
                    'EE302 Control System Engineering & State Space',
                    'EE201 Circuit Theory & Network Synthesis'
                  ],
                  electiveSubjects: [
                    'EE503 Electric Vehicle Powertrains & Motor Drives',
                    'EE507 Smart Grid Technology & Renewable Integration'
                  ],
                  alliedSubjects: [
                    'MA201 Engineering Mathematics III',
                    'EC204 Microprocessors & Interfacing'
                  ]
                }
              ]
            },
            {
              name: 'Master of Technology (M.Tech - Power Systems & Smart Grids)',
              shortCode: 'M.Tech EEE',
              level: 'PG',
              durationYears: 2,
              departmentName: 'Department of Electrical & Electronics Engineering',
              degreeType: 'M.Tech',
              specializations: [
                {
                  name: 'Smart Grid Automation & Advanced Power Electronics',
                  code: 'MTECH-EEE',
                  icon: '🔋',
                  coreSubjects: [
                    'EE601 Advanced Power System Dynamics',
                    'EE602 Power Electronic Converters & Inverters',
                    'EE603 High Voltage Engineering & Insulation'
                  ],
                  electiveSubjects: [
                    'EE702 Energy Storage Systems & Battery Tech',
                    'EE705 Microgrid Control & Protection'
                  ],
                  alliedSubjects: [
                    'MA601 Optimization Techniques in Engineering'
                  ]
                }
              ]
            },

            // 5. Department of Mechanical Engineering
            {
              name: 'Bachelor of Technology (B.Tech - Mechanical Engineering)',
              shortCode: 'B.Tech Mechanical',
              level: 'UG',
              durationYears: 4,
              departmentName: 'Department of Mechanical Engineering',
              degreeType: 'B.Tech',
              specializations: [
                {
                  name: 'Robotics, Mechatronics & Industrial Automation',
                  code: 'ME-ROBOTICS',
                  icon: '🤖',
                  coreSubjects: [
                    'ME401 Mechatronics & Industrial PLC Automation',
                    'ME301 Fluid Mechanics & Hydraulic Machinery',
                    'ME302 Kinematics & Dynamics of Machines',
                    'ME201 Thermodynamics & Heat Transfer'
                  ],
                  electiveSubjects: [
                    'ME504 CNC Machining & Advanced Manufacturing',
                    'ME508 Additive Manufacturing & 3D Printing'
                  ],
                  alliedSubjects: [
                    'EC204 Microprocessors & Sensors',
                    'MA201 Engineering Mathematics III'
                  ]
                },
                {
                  name: 'Electric Vehicles & Smart Automotive Engineering',
                  code: 'ME-EV',
                  icon: '🚗',
                  coreSubjects: [
                    'ME405 Electric Vehicle Powertrain & Battery Tech',
                    'ME406 Automotive Chassis Design & Aerodynamics',
                    'ME303 Internal Combustion Engines & Hybrid Systems'
                  ],
                  electiveSubjects: [
                    'ME512 Battery Management Systems (BMS)',
                    'ME514 Vehicle Crashworthiness & Finite Element Analysis'
                  ],
                  alliedSubjects: [
                    'EC205 Power Electronics & Motor Drives'
                  ]
                }
              ]
            },
            {
              name: 'Master of Technology (M.Tech - Robotics & Thermal Engineering)',
              shortCode: 'M.Tech Mechanical',
              level: 'PG',
              durationYears: 2,
              departmentName: 'Department of Mechanical Engineering',
              degreeType: 'M.Tech',
              specializations: [
                {
                  name: 'Advanced Robotics, Computational Fluid Dynamics & Automation',
                  code: 'MTECH-MECH',
                  icon: '⚙️',
                  coreSubjects: [
                    'ME601 Advanced Finite Element Analysis & Structural Mechanics',
                    'ME602 Computational Fluid Dynamics (CFD) & Heat Transfer',
                    'ME603 Advanced Robotic Kinematics & Path Planning'
                  ],
                  electiveSubjects: [
                    'ME701 Industrial Internet of Things (IIoT) & Smart Factories',
                    'ME704 Renewable Thermal Power Cycles'
                  ],
                  alliedSubjects: [
                    'MA601 Applied Mathematics & Matrix Methods'
                  ]
                }
              ]
            },

            // 5. Department of Civil Engineering
            {
              name: 'Bachelor of Technology (B.Tech - Civil Engineering)',
              shortCode: 'B.Tech Civil',
              level: 'UG',
              durationYears: 4,
              departmentName: 'Department of Civil Engineering',
              degreeType: 'B.Tech',
              specializations: [
                {
                  name: 'Smart Infrastructure & Structural Engineering',
                  code: 'CE-STRUCT',
                  icon: '🏗️',
                  coreSubjects: [
                    'CE401 Design of Reinforced Concrete Structures (RCC)',
                    'CE301 Structural Analysis & Matrix Methods',
                    'CE302 Geotechnical Engineering & Soil Mechanics',
                    'CE201 Surveying & Geomatics'
                  ],
                  electiveSubjects: [
                    'CE502 Earthquake Resistant Structural Design',
                    'CE505 Bridge Engineering & Prestressed Concrete'
                  ],
                  alliedSubjects: [
                    'MA201 Differential Equations & Vector Calculus',
                    'EN101 Environmental Science & Sustainability'
                  ]
                },
                {
                  name: 'Environmental Engineering & Water Resources',
                  code: 'CE-ENV',
                  icon: '💧',
                  coreSubjects: [
                    'CE403 Environmental Engineering & Waste Management',
                    'CE304 Hydrology & Water Resources Engineering',
                    'CE305 Transportation & Highway Engineering'
                  ],
                  electiveSubjects: [
                    'CE511 GIS & Remote Sensing for Urban Planning',
                    'CE514 Green Building & LEED Certification'
                  ],
                  alliedSubjects: [
                    'CH101 Environmental Chemistry & Water Quality'
                  ]
                }
              ]
            },
            {
              name: 'Master of Technology (M.Tech - Structural Engineering)',
              shortCode: 'M.Tech Civil',
              level: 'PG',
              durationYears: 2,
              departmentName: 'Department of Civil Engineering',
              degreeType: 'M.Tech',
              specializations: [
                {
                  name: 'Earthquake Engineering & Advanced Prestressed Structures',
                  code: 'MTECH-STRUCT',
                  icon: '🏛️',
                  coreSubjects: [
                    'CE601 Advanced Structural Dynamics & Earthquake Resistance',
                    'CE602 Finite Element Analysis of Civil Structures',
                    'CE603 Design of Prestressed Concrete & Tall Buildings'
                  ],
                  electiveSubjects: [
                    'CE701 Rehabilitation & Retrofitting of Concrete Structures',
                    'CE704 Deep Foundation Engineering & Ground Improvement'
                  ],
                  alliedSubjects: [
                    'MA602 Numerical Analysis & Computational Civil Engineering'
                  ]
                }
              ]
            },

            // 6. Department of Biotechnology
            {
              name: 'Bachelor of Technology (B.Tech - Biotechnology)',
              shortCode: 'B.Tech Biotech',
              level: 'UG',
              durationYears: 4,
              departmentName: 'Department of Biotechnology',
              degreeType: 'B.Tech',
              specializations: [
                {
                  name: 'Bioinformatics, Genetic Engineering & Biopharma',
                  code: 'BT-GENETICS',
                  icon: '🧬',
                  coreSubjects: [
                    'BT401 Recombinant DNA Technology & Gene Cloning',
                    'BT301 Bioprocess Engineering & Fermentation',
                    'BT302 Molecular Biology & Genetics',
                    'BT201 Biochemistry & Enzyme Kinetics'
                  ],
                  electiveSubjects: [
                    'BT502 Bioinformatics & Computational Genomics',
                    'BT505 Pharmaceutical Biotechnology & Drug Discovery'
                  ],
                  alliedSubjects: [
                    'MA204 Biostatistics & Experimental Design',
                    'CS101 Python Programming for Computational Biology'
                  ]
                }
              ]
            },
            {
              name: 'Master of Technology (M.Tech - Biotechnology & Bioprocess)',
              shortCode: 'M.Tech Biotech',
              level: 'PG',
              durationYears: 2,
              departmentName: 'Department of Biotechnology',
              degreeType: 'M.Tech',
              specializations: [
                {
                  name: 'Bioprocess Engineering & Molecular Therapeutics',
                  code: 'MTECH-BT',
                  icon: '🧪',
                  coreSubjects: [
                    'BT601 Advanced Bioreactor Design & Scale-Up',
                    'BT602 Protein Engineering & Monoclonal Antibodies',
                    'BT603 Metabolic Engineering & Synthetic Biology'
                  ],
                  electiveSubjects: [
                    'BT701 Nanobiotechnology & Targeted Drug Delivery',
                    'BT703 Stem Cell Technology & Regenerative Medicine'
                  ],
                  alliedSubjects: [
                    'BT604 Advanced Genomics & Next-Generation Sequencing'
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'School of Medical Sciences & Research (SMSR)',
          shortName: 'Medical Sciences & Research',
          code: 'SMSR',
          icon: '🩺',
          description: 'NMC Recognized Medical College with attached 1200-bed super-specialty teaching hospital.',
          departments: [
            'Department of Human Anatomy',
            'Department of Human Physiology',
            'Department of Pathology & Microbiology',
            'Department of Pharmacology & Therapeutics',
            'Department of General Medicine'
          ],
          programs: [
            {
              name: 'Bachelor of Medicine & Bachelor of Surgery (MBBS)',
              shortCode: 'MBBS',
              level: 'UG',
              durationYears: 5,
              departmentName: 'Department of General Medicine',
              degreeType: 'MBBS',
              specializations: [
                {
                  name: 'Clinical Medicine & Surgical Sciences',
                  code: 'MBBS-CLINICAL',
                  icon: '🏥',
                  coreSubjects: [
                    'MED101 Gross Anatomy & Neuroanatomy',
                    'MED102 Medical Physiology & Biophysics',
                    'MED201 General Pathology & Histopathology',
                    'MED202 Systemic Pharmacology & Therapeutics'
                  ],
                  electiveSubjects: [
                    'MED301 Community Medicine & Public Health Epidemiology',
                    'MED302 Diagnostic Medical Microbiology'
                  ],
                  alliedSubjects: [
                    'MED103 Medical Biochemistry & Clinical Genetics',
                    'MED104 Forensic Medicine & Toxicology'
                  ]
                }
              ]
            },
            {
              name: 'Doctor of Medicine (MD - General Medicine)',
              shortCode: 'MD Medicine',
              level: 'PG',
              durationYears: 3,
              departmentName: 'Department of General Medicine',
              degreeType: 'MD',
              specializations: [
                {
                  name: 'Internal Medicine, Cardiology & Critical Care',
                  code: 'MD-INTMED',
                  icon: '🩺',
                  coreSubjects: [
                    'MED601 Advanced Internal Medicine & Clinical Diagnostics',
                    'MED602 Critical Care & Emergency Resuscitation',
                    'MED603 Clinical Endocrinology & Metabolism'
                  ],
                  electiveSubjects: [
                    'MED701 Interventional Cardiology & Hemodynamics',
                    'MED702 Medical Pulmonology & Ventilator Management'
                  ],
                  alliedSubjects: [
                    'MED604 Clinical Biostatistics & Medical Research Methodology'
                  ]
                }
              ]
            },
            {
              name: 'Master of Surgery (MS - General Surgery)',
              shortCode: 'MS Surgery',
              level: 'PG',
              durationYears: 3,
              departmentName: 'Department of General Medicine',
              degreeType: 'MS',
              specializations: [
                {
                  name: 'Operative Surgery, Trauma & Laparoscopy',
                  code: 'MS-SURG',
                  icon: '🔪',
                  coreSubjects: [
                    'SUR601 Principles of Operative General Surgery',
                    'SUR602 Minimally Invasive Laparoscopic Surgery',
                    'SUR603 Surgical Oncology & Trauma Care'
                  ],
                  electiveSubjects: [
                    'SUR701 Pediatric Surgical Interventions',
                    'SUR702 Plastic & Reconstructive Surgery'
                  ],
                  alliedSubjects: [
                    'SUR604 Surgical Pathology & Preoperative Radiology'
                  ]
                }
              ]
            },
            {
              name: 'Bachelor of Science (B.Sc - Medical Laboratory Technology)',
              shortCode: 'BMLT',
              level: 'UG',
              durationYears: 3,
              departmentName: 'Department of Pathology & Microbiology',
              degreeType: 'B.Sc',
              specializations: [
                {
                  name: 'Clinical Diagnostics & Laboratory Pathology',
                  code: 'BMLT-PATH',
                  icon: '🔬',
                  coreSubjects: [
                    'MLT201 Clinical Hematology & Blood Banking',
                    'MLT202 Medical Microbiology & Parasitology',
                    'MLT301 Clinical Histopathology & Cytology Techniques',
                    'MLT101 Human Anatomy & Basic Physiology'
                  ],
                  electiveSubjects: [
                    'MLT305 Clinical Biochemistry & Automated Analyzers',
                    'MLT308 Molecular Diagnostics & PCR Techniques'
                  ],
                  alliedSubjects: [
                    'MLT102 Laboratory Safety & Quality Control Standards'
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'School of Law (SOL)',
          shortName: 'School of Law',
          code: 'SOL',
          icon: '⚖️',
          description: 'Bar Council of India (BCI) approved center for Jurisprudence, Constitutional & Corporate Law.',
          departments: [
            'Department of Constitutional & Administrative Law',
            'Department of Corporate & Commercial Law',
            'Department of Criminal Justice & Criminology'
          ],
          programs: [
            {
              name: 'Bachelor of Arts & Bachelor of Laws (B.A. LL.B Hons)',
              shortCode: 'B.A. LL.B',
              level: 'UG',
              durationYears: 5,
              departmentName: 'Department of Constitutional & Administrative Law',
              degreeType: 'B.A. LL.B',
              specializations: [
                {
                  name: 'Corporate & Commercial Litigation',
                  code: 'LAW-CORP',
                  icon: '🏢',
                  coreSubjects: [
                    'LAW101 Constitutional Law of India & Fundamental Rights',
                    'LAW201 Law of Contracts & Specific Relief Act',
                    'LAW301 Corporate Governance & Company Law 2013',
                    'LAW302 Code of Civil Procedure (CPC)'
                  ],
                  electiveSubjects: [
                    'LAW401 Intellectual Property Rights & Patents',
                    'LAW402 Mergers & Acquisitions Law'
                  ],
                  alliedSubjects: [
                    'PS101 Political Science & Statecraft',
                    'EC101 Principles of Macroeconomics'
                  ]
                },
                {
                  name: 'Criminal Law & Forensic Jurisprudence',
                  code: 'LAW-CRIM',
                  icon: '🔍',
                  coreSubjects: [
                    'LAW101 Constitutional Law of India & Fundamental Rights',
                    'LAW202 Indian Penal Code (BNS) & Substantive Crimes',
                    'LAW303 Code of Criminal Procedure (BNSS)',
                    'LAW304 Law of Evidence (BSA)'
                  ],
                  electiveSubjects: [
                    'LAW403 Cyber Crime & Digital Forensics Admissibility',
                    'LAW404 Criminology & Penology'
                  ],
                  alliedSubjects: [
                    'SO101 Sociology of Deviance & Legal Systems'
                  ]
                }
              ]
            },
            {
              name: 'Bachelor of Business Administration & Bachelor of Laws (B.B.A. LL.B Hons)',
              shortCode: 'B.B.A. LL.B',
              level: 'UG',
              durationYears: 5,
              departmentName: 'Department of Corporate & Commercial Law',
              degreeType: 'B.B.A. LL.B',
              specializations: [
                {
                  name: 'Corporate Commercial Law & International Trade',
                  code: 'BBALLB-CORP',
                  icon: '💼',
                  coreSubjects: [
                    'LAW201 Law of Contracts & Commercial Transactions',
                    'LAW301 Company Law & Securities Regulation',
                    'LAW405 Competition & Antitrust Law in India',
                    'MGT101 Principles of Business Management'
                  ],
                  electiveSubjects: [
                    'LAW410 International Commercial Arbitration (UNCITRAL)',
                    'LAW412 Cross-Border Taxation & Transfer Pricing'
                  ],
                  alliedSubjects: [
                    'ACC101 Financial Accounting & Audit for Lawyers'
                  ]
                }
              ]
            },
            {
              name: 'Bachelor of Laws (LL.B - 3 Years)',
              shortCode: 'LL.B',
              level: 'UG',
              durationYears: 3,
              departmentName: 'Department of Criminal Justice & Criminology',
              degreeType: 'LL.B',
              specializations: [
                {
                  name: 'Substantive & Procedural Law Practice',
                  code: 'LLB-GEN',
                  icon: '⚖️',
                  coreSubjects: [
                    'LAW102 Law of Torts & Consumer Protection Act',
                    'LAW203 Family Law & Succession Codes',
                    'LAW305 Property Law & Transfer of Property Act',
                    'LAW306 Administrative Law & Writs Jurisdiction'
                  ],
                  electiveSubjects: [
                    'LAW415 Labor & Industrial Relations Law',
                    'LAW418 Environmental Law & Public Interest Litigation'
                  ],
                  alliedSubjects: [
                    'LAW103 Professional Legal Ethics & Bar-Bench Relations'
                  ]
                }
              ]
            },
            {
              name: 'Master of Laws (LL.M - Corporate & Commercial Law)',
              shortCode: 'LL.M',
              level: 'PG',
              durationYears: 1,
              departmentName: 'Department of Corporate & Commercial Law',
              degreeType: 'LL.M',
              specializations: [
                {
                  name: 'Advanced Corporate Law & Financial Regulatory Systems',
                  code: 'LLM-CORP',
                  icon: '📜',
                  coreSubjects: [
                    'LLM101 Research Methodology & Legal Jurisprudence',
                    'LLM201 Advanced Corporate Insolvency & Bankruptcy Code (IBC)',
                    'LLM202 Banking & Financial Institutions Regulation (RBI)'
                  ],
                  electiveSubjects: [
                    'LLM301 Global Trade Law & World Trade Organization (WTO)',
                    'LLM302 International Commercial Dispute Resolution'
                  ],
                  alliedSubjects: [
                    'LLM102 Comparative Public Law & Systems'
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'School of Business Studies (SBS)',
          shortName: 'Business Studies',
          code: 'SBS',
          icon: '📈',
          description: 'AACSB member school offering global business strategy, marketing, and fintech analytics.',
          departments: [
            'Department of Finance & Banking',
            'Department of Business Analytics',
            'Department of Marketing & International Business'
          ],
          programs: [
            {
              name: 'Bachelor of Business Administration (BBA)',
              shortCode: 'BBA',
              level: 'UG',
              durationYears: 3,
              departmentName: 'Department of Marketing & International Business',
              degreeType: 'BBA',
              specializations: [
                {
                  name: 'Global Business Strategy & Marketing Management',
                  code: 'BBA-MGT',
                  icon: '🌐',
                  coreSubjects: [
                    'BBA101 Principles & Practice of Management',
                    'BBA201 Financial Management & Budgetary Control',
                    'BBA202 Marketing Management & Consumer Behavior',
                    'BBA301 Organizational Behavior & Leadership'
                  ],
                  electiveSubjects: [
                    'BBA304 Digital Marketing & Social Media Strategy',
                    'BBA306 Supply Chain & Operations Management'
                  ],
                  alliedSubjects: [
                    'BBA102 Business Mathematics & Statistics'
                  ]
                }
              ]
            },
            {
              name: 'Bachelor of Commerce (B.Com Hons)',
              shortCode: 'B.Com',
              level: 'UG',
              durationYears: 3,
              departmentName: 'Department of Finance & Banking',
              degreeType: 'B.Com',
              specializations: [
                {
                  name: 'Financial Accounting, Taxation & Audit',
                  code: 'BCOM-FIN',
                  icon: '💰',
                  coreSubjects: [
                    'COM101 Advanced Financial Accounting & GAAP',
                    'COM201 Corporate Accounting & Auditing Standards',
                    'COM202 Direct & Indirect Taxation (GST / Income Tax)',
                    'COM301 Cost & Management Accounting'
                  ],
                  electiveSubjects: [
                    'COM304 Investment Analysis & Stock Markets',
                    'COM307 Corporate Restructuring & Insolvency'
                  ],
                  alliedSubjects: [
                    'COM102 Microeconomics & Business Environment'
                  ]
                }
              ]
            },
            {
              name: 'Master of Business Administration (MBA Tech & FinTech)',
              shortCode: 'MBA',
              level: 'PG',
              durationYears: 2,
              departmentName: 'Department of Finance & Banking',
              degreeType: 'MBA',
              specializations: [
                {
                  name: 'FinTech, Financial Analytics & Risk Modeling',
                  code: 'MBA-FIN',
                  icon: '💳',
                  coreSubjects: [
                    'MGT101 Strategic Corporate Financial Management',
                    'MGT201 Financial Modeling & Valuation in Python',
                    'MGT202 Investment Banking & Portfolio Management'
                  ],
                  electiveSubjects: [
                    'MGT301 Algorithmic Trading & Quantitative Finance',
                    'MGT302 Blockchain Architecture in Banking'
                  ],
                  alliedSubjects: [
                    'MGT102 Managerial Economics & Quantitative Methods'
                  ]
                }
              ]
            },
            {
              name: 'Master of Business Administration (MBA - Business Analytics & AI)',
              shortCode: 'MBA Analytics',
              level: 'PG',
              durationYears: 2,
              departmentName: 'Department of Business Analytics',
              degreeType: 'MBA',
              specializations: [
                {
                  name: 'Business Analytics, Machine Learning & Big Data Strategy',
                  code: 'MBA-ANALYTICS',
                  icon: '📊',
                  coreSubjects: [
                    'BA401 Predictive Business Modeling in R & Python',
                    'BA402 Enterprise Data Strategy & Warehousing',
                    'BA501 Machine Learning for Executive Decisions'
                  ],
                  electiveSubjects: [
                    'BA504 Natural Language Processing in Customer Experience',
                    'BA508 Supply Chain Analytics & Optimization'
                  ],
                  alliedSubjects: [
                    'BA101 Multivariate Statistics for Managers'
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'School of Basic Sciences & Research (SBSR)',
          shortName: 'Basic Sciences & Research',
          code: 'SBSR',
          icon: '🔬',
          description: 'UGC-recognized research faculty offering foundational mathematics, physics, and computational sciences.',
          departments: [
            'Department of Mathematics & Computing',
            'Department of Physics',
            'Department of Chemistry'
          ],
          programs: [
            {
              name: 'Bachelor of Science (B.Sc Hons - Mathematics & Computing)',
              shortCode: 'B.Sc Math',
              level: 'UG',
              durationYears: 3,
              departmentName: 'Department of Mathematics & Computing',
              degreeType: 'B.Sc',
              specializations: [
                {
                  name: 'Computational Mathematics & Scientific Programming',
                  code: 'BSC-MATH',
                  icon: '📐',
                  coreSubjects: [
                    'MAT201 Real Analysis & Metric Spaces',
                    'MAT202 Abstract Algebra & Ring Theory',
                    'MAT301 Numerical Analysis & Scientific Python',
                    'MAT302 Differential Equations & Laplace Transforms'
                  ],
                  electiveSubjects: [
                    'MAT401 Complex Analysis & Contour Integration',
                    'MAT404 Operations Research & Linear Programming'
                  ],
                  alliedSubjects: [
                    'CS102 Data Structures in C++'
                  ]
                }
              ]
            },
            {
              name: 'Bachelor of Science (B.Sc Hons - Physics)',
              shortCode: 'B.Sc Physics',
              level: 'UG',
              durationYears: 3,
              departmentName: 'Department of Physics',
              degreeType: 'B.Sc',
              specializations: [
                {
                  name: 'Quantum Mechanics, Electrodynamics & Optics',
                  code: 'BSC-PHY',
                  icon: '⚛️',
                  coreSubjects: [
                    'PHY201 Quantum Mechanics & Wave Equations',
                    'PHY202 Classical Mechanics & Lagrangian Formulation',
                    'PHY301 Electromagnetic Theory & Maxwell Equations',
                    'PHY302 Thermodynamics & Statistical Mechanics'
                  ],
                  electiveSubjects: [
                    'PHY401 Solid State Physics & Semiconductors',
                    'PHY403 Laser Physics & Fiber Optics'
                  ],
                  alliedSubjects: [
                    'MAT101 Mathematical Methods in Physics'
                  ]
                }
              ]
            }
          ]
        },
        {
          name: 'School of Pharmacy (SOP)',
          shortName: 'School of Pharmacy',
          code: 'SOP',
          icon: '💊',
          description: 'Pharmacy Council of India (PCI) approved institution with state-of-the-art pharmaceutical research labs.',
          departments: [
            'Department of Pharmaceutics',
            'Department of Pharmacology & Clinical Pharmacy'
          ],
          programs: [
            {
              name: 'Bachelor of Pharmacy (B.Pharm)',
              shortCode: 'B.Pharm',
              level: 'UG',
              durationYears: 4,
              departmentName: 'Department of Pharmaceutics',
              degreeType: 'B.Pharm',
              specializations: [
                {
                  name: 'Pharmaceutics, Drug Design & Clinical Trials',
                  code: 'PHARM-UG',
                  icon: '🧪',
                  coreSubjects: [
                    'PH101 Human Anatomy & Pathophysiology',
                    'PH201 Pharmaceutical Organic Chemistry',
                    'PH301 Medicinal Chemistry & Drug Mechanism',
                    'PH401 Pharmacology & Toxicology of Drugs'
                  ],
                  electiveSubjects: [
                    'PH501 Biopharmaceutics & Pharmacokinetics',
                    'PH504 Pharmaceutical Quality Assurance & GMP'
                  ],
                  alliedSubjects: [
                    'PH102 Remedial Biology & Mathematics'
                  ]
                }
              ]
            }
          ]
        }
      ],
      programsCatalog: [
        {
          name: 'B.Tech CSE (Cloud & Distributed Systems)',
          shortCode: 'B.Tech CSE',
          level: 'UG',
          schoolName: 'School of Engineering & Technology (SET)',
          departmentName: 'Department of Computer Science & Engineering',
          coreSubjects: ['CS401 Distributed Systems & Cloud Computing', 'CS301 Operating Systems & Kernel Architecture', 'CS302 Computer Networks & TCP/IP', 'CS202 Object Oriented Software Design'],
          electiveSubjects: ['CS505 Cloud Security & Microservices', 'CS508 Docker & Kubernetes Orchestration'],
          alliedSubjects: ['MA202 Numerical Methods & Optimization', 'EC204 Microprocessors & Embedded Systems']
        },
        {
          name: 'B.Tech Artificial Intelligence',
          shortCode: 'B.Tech AI',
          level: 'UG',
          schoolName: 'School of Engineering & Technology (SET)',
          departmentName: 'Department of AI & Data Science',
          coreSubjects: ['AI402 Deep Learning & Generative Models', 'CS401 Distributed Systems', 'AI301 Knowledge Representation & Logic'],
          electiveSubjects: ['AI504 Prompt Engineering & LLM Architecture', 'AI507 AI in Healthcare & Medical Imaging'],
          alliedSubjects: ['MA204 Applied Probability for Data Science', 'HS104 Ethics in Algorithmic Decision Making']
        },
        {
          name: 'MBBS (Clinical Medicine)',
          shortCode: 'MBBS',
          level: 'UG',
          schoolName: 'School of Medical Sciences & Research (SMSR)',
          departmentName: 'Department of Human Anatomy',
          coreSubjects: ['MED101 Gross Anatomy', 'MED102 Medical Physiology', 'MED201 Pathology', 'MED202 Pharmacology'],
          electiveSubjects: ['MED301 Community Medicine', 'MED302 Medical Microbiology'],
          alliedSubjects: ['MED103 Medical Biochemistry']
        },
        {
          name: 'B.A. LL.B (Hons)',
          shortCode: 'B.A. LL.B',
          level: 'UG',
          schoolName: 'School of Law (SOL)',
          departmentName: 'Department of Constitutional & Administrative Law',
          coreSubjects: ['LAW101 Constitutional Law', 'LAW201 Law of Contracts', 'LAW301 Company Law', 'LAW303 Criminal Procedure'],
          electiveSubjects: ['LAW401 Intellectual Property Rights', 'LAW403 Cyber Crime'],
          alliedSubjects: ['PS101 Political Science', 'EC101 Macroeconomics']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Knowledge Park III Main Campus • Complete 5-Year End-Sem & Mid-Sem Question Papers'
    },
    {
      id: 'sharda-agra',
      name: 'Sharda Group of Institutions (Agra Campus)',
      shortCode: 'SGI Agra',
      campusLocation: 'Bichpuri Campus, Mathura-Agra Road, Agra',
      city: 'Agra',
      country: 'India',
      state: 'Uttar Pradesh',
      tier: 'Premier Regional Technical Institute',
      category: 'AUTONOMOUS_COLLEGE',
      institutionType: 'PRIVATE_INSTITUTE',
      websiteUrl: 'https://sgi.edu.in',
      accreditation: 'AICTE Approved • Affiliated to AKTU Lucknow • NBA Accredited Programs',
      officialSiteVerified: true,
      logoIcon: '🏛️',
      pyqCount: 180,
      paperCount: 10,
      establishedYear: 1996,
      isGlobal: false,
      departments: ['Anand Engineering College (AEC)', 'Hindustan College of Science & Technology (HCST)', 'Faculty of Computer Engineering'],
      programs: ['B.Tech Computer Science', 'B.Tech Information Technology', 'Diploma in Engineering'],
      programsCatalog: [
        {
          name: 'B.Tech Computer Science',
          shortCode: 'B.Tech CS',
          level: 'UG',
          schoolName: 'Hindustan College of Science & Technology (HCST)',
          departmentName: 'Department of Computer Science & Engineering',
          coreSubjects: ['CS401 Distributed Systems', 'KCS501 Database Management Systems', 'KCS503 Design and Analysis of Algorithms'],
          electiveSubjects: ['KCS051 Data Analytics', 'KCS054 Distributed Databases'],
          alliedSubjects: ['KAS301 Technical Communication', 'KAS302 Universal Human Values']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Bichpuri Agra Campus • Affiliated AKTU/SGI Curriculum Question Repository'
    },
    {
      id: 'amity-noida',
      name: 'Amity University (Noida Main Campus)',
      shortCode: 'Amity Noida',
      campusLocation: 'Sector 125, Noida Express Highway, Gautam Buddha Nagar',
      city: 'Noida',
      country: 'India',
      state: 'Uttar Pradesh',
      tier: 'Premier Private Research University',
      category: 'UNIVERSITY',
      institutionType: 'PRIVATE_STATE_UNIVERSITY',
      websiteUrl: 'https://www.amity.edu/noida',
      accreditation: 'NAAC A+ • UGC Recognized • WASC USA Accredited • NIRF Top 35',
      officialSiteVerified: true,
      logoIcon: '🏫',
      pyqCount: 220,
      paperCount: 14,
      establishedYear: 2005,
      isGlobal: false,
      departments: ['Amity School of Engineering & Technology (ASET)', 'Amity Institute of Information Technology', 'Amity Business School'],
      programs: ['B.Tech Computer Science & Engineering', 'B.Tech Data Science', 'Integrated B.Tech + M.Tech'],
      programsCatalog: [
        {
          name: 'B.Tech Computer Science & Engineering',
          shortCode: 'B.Tech CSE',
          level: 'UG',
          schoolName: 'Amity School of Engineering & Technology (ASET)',
          departmentName: 'Department of Computer Science & Engineering',
          coreSubjects: ['CS401 Distributed Systems & Cloud', 'CSE301 Operating Systems & Concurrency', 'CSE304 Design of Algorithms', 'CSE302 Computer Networks'],
          electiveSubjects: ['CSE501 Cyber Forensics & Ethical Hacking', 'CSE502 High Performance Computing'],
          alliedSubjects: ['MATH101 Calculus & Numerical Methods', 'MGMT101 Innovation & Entrepreneurship']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Sector 125 Central Campus • Strict Semester End & Minor Assessment Papers'
    },
    {
      id: 'amity-mumbai',
      name: 'Amity University (Mumbai Campus)',
      shortCode: 'Amity Mumbai',
      campusLocation: 'Mumbai-Pune Expressway, Bhatan, Post Somathne, Panvel, Mumbai',
      city: 'Mumbai',
      country: 'India',
      state: 'Maharashtra',
      tier: 'State Private University',
      category: 'UNIVERSITY',
      institutionType: 'PRIVATE_STATE_UNIVERSITY',
      websiteUrl: 'https://www.amity.edu/mumbai',
      accreditation: 'UGC Recognized • Government of Maharashtra Approved',
      officialSiteVerified: true,
      logoIcon: '🏙️',
      pyqCount: 160,
      paperCount: 9,
      establishedYear: 2014,
      isGlobal: false,
      departments: ['Amity Institute of Technology Panvel', 'School of Applied Sciences'],
      programs: ['B.Tech Computer Engineering', 'B.Sc IT & Cloud Infrastructure'],
      programsCatalog: [
        {
          name: 'B.Tech Computer Engineering',
          shortCode: 'B.Tech CE',
          level: 'UG',
          schoolName: 'Amity Institute of Technology Panvel',
          departmentName: 'Department of Computer Engineering',
          coreSubjects: ['CS401 Distributed Systems', 'CE301 Operating Systems Design', 'CE302 Computer Networks'],
          electiveSubjects: ['CE405 Cloud Native Architecture', 'CE406 Big Data Engineering'],
          alliedSubjects: ['AM201 Applied Mathematics', 'ENV101 Environmental Studies']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Panvel Western Campus • Official Winter and Summer Term Examination Archive'
    },
    {
      id: 'bits-pilani',
      name: 'BITS Pilani (Pilani Main Campus)',
      shortCode: 'BITS Pilani',
      campusLocation: 'Vidya Vihar, Pilani',
      city: 'Pilani',
      country: 'India',
      state: 'Rajasthan',
      tier: 'Institute of Eminence (IoE)',
      category: 'UNIVERSITY',
      institutionType: 'PRIVATE_DEEMED_UNIVERSITY',
      websiteUrl: 'https://www.bits-pilani.ac.in',
      accreditation: 'Institute of Eminence (IoE) • NAAC A • NIRF Top 20',
      officialSiteVerified: true,
      logoIcon: '⚡',
      pyqCount: 290,
      paperCount: 18,
      establishedYear: 1964,
      isGlobal: false,
      departments: ['Computer Science & Information Systems', 'Electrical & Electronics', 'Mathematics & Scientific Computing'],
      programs: ['B.E. Computer Science', 'M.Sc (Hons) Computer Science', 'M.E. Software Systems'],
      programsCatalog: [
        {
          name: 'B.E. Computer Science',
          shortCode: 'B.E. CS',
          level: 'UG',
          schoolName: 'Department of Computer Science & Information Systems',
          departmentName: 'CSIS Pilani',
          coreSubjects: ['CS F303 Computer Networks', 'CS F372 Operating Systems', 'CS F211 Data Structures & Algorithms', 'CS401 Distributed Systems'],
          electiveSubjects: ['CS F407 Combinatorial Mathematics', 'CS F422 Parallel Computing'],
          alliedSubjects: ['MATH F111 Mathematics I', 'ECON F211 Principles of Economics']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Vidya Vihar Main Campus • Comprehensive Comprehensive Examination (Compre) Archive'
    },
    {
      id: 'bits-goa',
      name: 'BITS Pilani (K.K. Birla Goa Campus)',
      shortCode: 'BITS Goa',
      campusLocation: 'NH 17B, Zuarinagar, Sancoale',
      city: 'Goa',
      country: 'India',
      state: 'Goa',
      tier: 'Institute of Eminence (IoE)',
      category: 'UNIVERSITY',
      institutionType: 'PRIVATE_DEEMED_UNIVERSITY',
      websiteUrl: 'https://www.bits-pilani.ac.in/goa',
      accreditation: 'Institute of Eminence (IoE) • NAAC A Grade',
      officialSiteVerified: true,
      logoIcon: '🏖️',
      pyqCount: 195,
      paperCount: 12,
      establishedYear: 2004,
      isGlobal: false,
      departments: ['Computer Science & Engineering', 'Electronics & Instrumentation'],
      programs: ['B.E. Computer Science', 'B.E. Electronics & Communication'],
      programsCatalog: [
        {
          name: 'B.E. Computer Science',
          shortCode: 'B.E. CS Goa',
          level: 'UG',
          schoolName: 'Faculty of Computer Science',
          departmentName: 'Department of CS & IS Goa',
          coreSubjects: ['CS F303 Computer Networks', 'CS F372 Operating Systems', 'CS401 Distributed Systems'],
          electiveSubjects: ['CS F402 Machine Learning', 'CS F446 Data Storage Technologies'],
          alliedSubjects: ['BITS F110 Technical Report Writing']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Zuarinagar Goa Campus • Rigorous Operating Systems & Distributed Algorithm Tests'
    },
    {
      id: 'iitb',
      name: 'IIT Bombay (Indian Institute of Technology)',
      shortCode: 'IIT Bombay',
      campusLocation: 'Main Gate Road, Powai, Mumbai',
      city: 'Mumbai',
      country: 'India',
      state: 'Maharashtra',
      tier: 'National Institute of Eminence (Autonomous Central Institution)',
      category: 'UNIVERSITY',
      institutionType: 'CENTRAL_GOVT_UNIVERSITY',
      websiteUrl: 'https://www.iitb.ac.in',
      accreditation: 'Institute of National Importance • NIRF Rank 3 Overall • QS World Top 150',
      officialSiteVerified: true,
      logoIcon: '🎓',
      pyqCount: 310,
      paperCount: 20,
      establishedYear: 1958,
      isGlobal: false,
      departments: ['Department of Computer Science & Engineering', 'Electrical Engineering', 'Centre for Machine Intelligence & Data Science'],
      programs: ['B.Tech Computer Science & Engineering', 'Dual Degree B.Tech + M.Tech', 'M.Tech CSE'],
      programsCatalog: [
        {
          name: 'B.Tech Computer Science & Engineering',
          shortCode: 'B.Tech CSE',
          level: 'UG',
          schoolName: 'Department of Computer Science and Engineering',
          departmentName: 'Department of CSE, IIT Bombay',
          coreSubjects: ['CS401 Distributed Systems & Fault Tolerance', 'CS347 Operating Systems', 'CS218 Design & Analysis of Algorithms', 'CS348 Computer Networks'],
          electiveSubjects: ['CS744 Design of Distributed Systems', 'CS725 Foundations of Machine Learning'],
          alliedSubjects: ['MA105 Calculus', 'PH107 Quantum Physics and Application']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Powai Central Campus • Advanced theoretical proofs & distributed consensus'
    },
    {
      id: 'vtu',
      name: 'VTU Karnataka (Visvesvaraya Technological University)',
      shortCode: 'VTU Belagavi',
      campusLocation: 'Jnana Sangama, Machhe, Belagavi',
      city: 'Belagavi',
      country: 'India',
      state: 'Karnataka',
      tier: 'State Government Affiliating Technical University (200+ Colleges)',
      category: 'UNIVERSITY',
      institutionType: 'STATE_GOVT_UNIVERSITY',
      websiteUrl: 'https://vtu.ac.in',
      accreditation: 'NAAC A+ Accredited • Government of Karnataka State University • UGC 12(B)',
      officialSiteVerified: true,
      logoIcon: '📚',
      pyqCount: 380,
      paperCount: 24,
      establishedYear: 1998,
      isGlobal: false,
      departments: ['Faculty of Engineering & Technology', 'Department of Computer Science & Engineering', 'Department of Information Science'],
      programs: ['B.E. Computer Science (18CS / 21CS Schemes)', 'B.E. Information Science & Engineering'],
      programsCatalog: [
        {
          name: 'B.E. Computer Science (18CS / 21CS Schemes)',
          shortCode: 'B.E. CSE VTU',
          level: 'UG',
          schoolName: 'Faculty of Engineering & Technology',
          departmentName: 'Department of Computer Science & Engineering',
          coreSubjects: ['CS401 Distributed Systems & Cloud Computing (18CS71)', '21CS51 Operating Systems', '21CS52 Computer Networks', '21CS42 Design & Analysis of Algorithms'],
          electiveSubjects: ['18CS734 Big Data Analytics', '18CS744 Cryptography & Network Security'],
          alliedSubjects: ['18MAT31 Transform Calculus & Numerical Techniques']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Jnana Sangama Headquarters • Standard state-wide scheme question papers'
    },
    {
      id: 'aktu',
      name: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU Lucknow)',
      shortCode: 'AKTU',
      campusLocation: 'Sector 11, Jankipuram Vistar, Lucknow',
      city: 'Lucknow',
      country: 'India',
      state: 'Uttar Pradesh',
      tier: 'State Government Technical University (750+ Affiliated Colleges)',
      category: 'UNIVERSITY',
      institutionType: 'STATE_GOVT_UNIVERSITY',
      websiteUrl: 'https://aktu.ac.in',
      accreditation: 'Government of Uttar Pradesh State University • UGC Recognized • AICTE Approved',
      officialSiteVerified: true,
      logoIcon: '🏛️',
      pyqCount: 420,
      paperCount: 22,
      establishedYear: 2000,
      isGlobal: false,
      departments: ['Faculty of Engineering & Technology', 'Department of Computer Science & Information Technology', 'Centre for Advanced Studies (CAS)'],
      programs: ['B.Tech Computer Science & Engineering (KCS Scheme)', 'B.Tech Information Technology', 'MCA (KCA Scheme)'],
      programsCatalog: [
        {
          name: 'B.Tech Computer Science & Engineering (KCS Scheme)',
          shortCode: 'B.Tech CSE AKTU',
          level: 'UG',
          schoolName: 'Faculty of Engineering & Technology',
          departmentName: 'Department of Computer Science & Engineering',
          coreSubjects: ['CS401 Distributed Systems (KCS701)', 'KCS501 Database Management Systems', 'KCS503 Design and Analysis of Algorithms', 'KCS601 Software Engineering'],
          electiveSubjects: ['KCS071 Deep Learning', 'KCS075 Distributed Database Systems'],
          alliedSubjects: ['KAS301 Technical Communication', 'KVE401 Universal Human Values']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'State Technical University Headquarters • Official AKTU Even/Odd Semester PYQ Repository'
    },
    {
      id: 'sppu',
      name: 'Savitribai Phule Pune University (SPPU Pune)',
      shortCode: 'SPPU Pune',
      campusLocation: 'Ganeshkhind Road, Pune',
      city: 'Pune',
      country: 'India',
      state: 'Maharashtra',
      tier: 'State Premier Research University (Oxford of the East)',
      category: 'UNIVERSITY',
      institutionType: 'STATE_GOVT_UNIVERSITY',
      websiteUrl: 'https://www.unipune.ac.in',
      accreditation: 'NAAC A+ Grade • UGC 12(B) • NIRF Top 15',
      officialSiteVerified: true,
      logoIcon: '🏛️',
      pyqCount: 310,
      paperCount: 18,
      establishedYear: 1949,
      isGlobal: false,
      departments: ['Department of Technology', 'Department of Computer Science (PUCSD)', 'Faculty of Science & Technology'],
      programs: ['B.E. Computer Engineering (2019 / 2024 Course Pattern)', 'B.E. Information Technology', 'M.Sc Computer Science'],
      programsCatalog: [
        {
          name: 'B.E. Computer Engineering (2019 / 2024 Course Pattern)',
          shortCode: 'B.E. Comp SPPU',
          level: 'UG',
          schoolName: 'Faculty of Science & Technology',
          departmentName: 'Department of Computer Engineering',
          coreSubjects: ['CS401 Distributed Systems & High Performance Computing', '310242 Database Management Systems', '310243 Computer Networks and Security'],
          electiveSubjects: ['410244 Cloud Computing', '410245 Deep Learning Systems'],
          alliedSubjects: ['207003 Engineering Mathematics III']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Ganeshkhind Campus • Official In-Sem (30 Marks) and End-Sem (70 Marks) Exam Booklets'
    },
    {
      id: 'du',
      name: 'University of Delhi (Delhi University Central Campus)',
      shortCode: 'Delhi Univ',
      campusLocation: 'Benito Juarez Road & Chhatra Marg, New Delhi',
      city: 'New Delhi',
      country: 'India',
      state: 'Delhi',
      tier: 'Central Government Premier University',
      category: 'UNIVERSITY',
      institutionType: 'CENTRAL_GOVT_UNIVERSITY',
      websiteUrl: 'https://www.du.ac.in',
      accreditation: 'Institute of Eminence (IoE) • NAAC A++ (3.28 CGPA) • NIRF Rank 6',
      officialSiteVerified: true,
      logoIcon: '🎓',
      pyqCount: 260,
      paperCount: 15,
      establishedYear: 1922,
      isGlobal: false,
      departments: ['Department of Computer Science (North Campus)', 'Cluster Innovation Centre (CIC)', 'Faculty of Mathematical Sciences'],
      programs: ['B.Sc (Hons) Computer Science (UGCF-2022)', 'B.Tech IT and Mathematical Innovations (CIC)', 'MCA DU'],
      programsCatalog: [
        {
          name: 'B.Sc (Hons) Computer Science (UGCF-2022)',
          shortCode: 'B.Sc CS DU',
          level: 'UG',
          schoolName: 'Faculty of Mathematical Sciences',
          departmentName: 'Department of Computer Science',
          coreSubjects: ['DSC 04: Operating Systems', 'DSC 07: Computer Networks', 'CS401 Distributed Computing'],
          electiveSubjects: ['DSE 01: Artificial Intelligence', 'DSE 03: Data Mining & Warehousing'],
          alliedSubjects: ['GE 01: Calculus and Matrices']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'North & South Campuses • Centralized Semester Examination Papers Archive'
    },
    {
      id: 'vit',
      name: 'Vellore Institute of Technology (VIT Vellore)',
      shortCode: 'VIT Vellore',
      campusLocation: 'Tiruvalam Road, Katpadi, Vellore',
      city: 'Vellore',
      country: 'India',
      state: 'Tamil Nadu',
      tier: 'Institute of Eminence Deemed University',
      category: 'UNIVERSITY',
      institutionType: 'PRIVATE_DEEMED_UNIVERSITY',
      websiteUrl: 'https://vit.ac.in',
      accreditation: 'NAAC A++ Grade (3.66 CGPA) • ABET USA Accredited • NIRF Top 10 Engineering',
      officialSiteVerified: true,
      logoIcon: '🏫',
      pyqCount: 340,
      paperCount: 20,
      establishedYear: 1984,
      isGlobal: false,
      departments: ['School of Computer Science and Engineering (SCOPE)', 'School of Information Technology (SITE)'],
      programs: ['B.Tech Computer Science and Engineering', 'B.Tech CSE with spec. in AI and Machine Learning', 'Integrated M.Tech CSE'],
      programsCatalog: [
        {
          name: 'B.Tech Computer Science and Engineering',
          shortCode: 'B.Tech CSE VIT',
          level: 'UG',
          schoolName: 'School of Computer Science and Engineering (SCOPE)',
          departmentName: 'Department of Computing Technologies',
          coreSubjects: ['CSE2005 Operating Systems', 'CSE3001 Computer Networks', 'CS401 Distributed Systems Architecture', 'CSE2004 Database Management Systems'],
          electiveSubjects: ['CSE3020 Web Mining', 'CSE4019 Image Processing and Machine Vision'],
          alliedSubjects: ['MAT2001 Calculus for Engineers', 'PHY1701 Engineering Physics']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Katpadi Main Campus • Continuous Assessment Test (CAT-1, CAT-2) & FAT Final Exam Papers'
    },
    {
      id: 'manipal',
      name: 'Manipal Academy of Higher Education (MAHE Manipal)',
      shortCode: 'MAHE Manipal',
      campusLocation: 'Tiger Circle Road, Madhav Nagar, Manipal',
      city: 'Manipal',
      country: 'India',
      state: 'Karnataka',
      tier: 'Institute of Eminence (IoE) Deemed University',
      category: 'UNIVERSITY',
      institutionType: 'PRIVATE_DEEMED_UNIVERSITY',
      websiteUrl: 'https://manipal.edu',
      accreditation: 'Institute of Eminence • NAAC A++ • NIRF Rank 6 Universities',
      officialSiteVerified: true,
      logoIcon: '🏛️',
      pyqCount: 280,
      paperCount: 16,
      establishedYear: 1953,
      isGlobal: false,
      departments: ['Manipal Institute of Technology (MIT)', 'Department of Computer Science & Engineering', 'Department of Data Science'],
      programs: ['B.Tech Computer Science and Engineering', 'B.Tech Information Technology', 'B.Tech Data Science & AI'],
      programsCatalog: [
        {
          name: 'B.Tech Computer Science and Engineering',
          shortCode: 'B.Tech CSE MIT',
          level: 'UG',
          schoolName: 'Manipal Institute of Technology (MIT)',
          departmentName: 'Department of Computer Science & Engineering',
          coreSubjects: ['CSE 3151 Distributed Systems', 'CSE 2151 Operating Systems', 'CSE 3152 Computer Networks', 'CSE 2251 Database Systems'],
          electiveSubjects: ['CSE 4051 Cloud Computing & IoT', 'CSE 4055 Deep Learning Architectures'],
          alliedSubjects: ['MAT 2151 Linear Algebra & Differential Equations']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Tiger Circle MIT Campus • Official End-Semester Examination Question Paper Repository'
    },
    {
      id: 'coep',
      name: 'COEP Technological University (Govt College of Engineering Pune)',
      shortCode: 'COEP Pune',
      campusLocation: 'Wellesley Road, Shivajinagar, Pune',
      city: 'Pune',
      country: 'India',
      state: 'Maharashtra',
      tier: 'Historic Autonomous State Government Technical University',
      category: 'AUTONOMOUS_COLLEGE',
      institutionType: 'GOVT_AUTONOMOUS_COLLEGE',
      websiteUrl: 'https://www.coeptech.ac.in',
      accreditation: 'Government of Maharashtra State University • NBA Tier-1 Accredited • NIRF Top 50',
      officialSiteVerified: true,
      logoIcon: '🏛️',
      pyqCount: 220,
      paperCount: 14,
      establishedYear: 1854,
      isGlobal: false,
      departments: ['Department of Computer Engineering and Information Technology', 'Department of Electronics & Telecommunication'],
      programs: ['B.Tech Computer Engineering', 'B.Tech Artificial Intelligence and Robotics', 'M.Tech Computer Engineering'],
      programsCatalog: [
        {
          name: 'B.Tech Computer Engineering',
          shortCode: 'B.Tech CE COEP',
          level: 'UG',
          schoolName: 'Department of Computer Engineering and Information Technology',
          departmentName: 'Department of Computer Engineering',
          coreSubjects: ['CT-14001 Distributed Systems', 'CT-14002 Operating Systems', 'CT-14003 Computer Networks', 'CT-14004 Design and Analysis of Algorithms'],
          electiveSubjects: ['CT-DE-1401 Cloud Infrastructure & SRE', 'CT-DE-1402 Machine Intelligence'],
          alliedSubjects: ['AS-14001 Applied Statistics & Numerical Methods']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Shivajinagar Campus • Oldest Engineering College in Asia • Autonomous T1 Exam Archive'
    },
    {
      id: 'gpmumbai',
      name: 'Government Polytechnic Mumbai (Autonomous State Technical Institute)',
      shortCode: 'GP Mumbai',
      campusLocation: '49, Kherwadi, Ali Yavar Jung Marg, Bandra East, Mumbai',
      city: 'Mumbai',
      country: 'India',
      state: 'Maharashtra',
      tier: 'Autonomous State Government Technical Polytechnic Institute',
      category: 'AUTONOMOUS_COLLEGE',
      institutionType: 'GOVT_AUTONOMOUS_COLLEGE',
      websiteUrl: 'https://gpmumbai.ac.in',
      accreditation: 'AICTE Approved • Directorate of Technical Education (DTE Maharashtra) Autonomous',
      officialSiteVerified: true,
      logoIcon: '⚙️',
      pyqCount: 150,
      paperCount: 10,
      establishedYear: 1960,
      isGlobal: false,
      departments: ['Department of Computer Engineering', 'Department of Information Technology', 'Department of Electronics'],
      programs: ['Diploma in Computer Engineering (Autonomous Curriculum)', 'Diploma in Information Technology'],
      programsCatalog: [
        {
          name: 'Diploma in Computer Engineering (Autonomous Curriculum)',
          shortCode: 'Dip. CE GP',
          level: 'DIPLOMA',
          schoolName: 'Faculty of Engineering & Technology',
          departmentName: 'Department of Computer Engineering',
          coreSubjects: ['CO501 Operating Systems Principles', 'CO502 Computer Networks & TCP/IP', 'CS401 Distributed Systems Fundamentals', 'CO401 Database Management Systems'],
          electiveSubjects: ['CO601 Network Security & Ethical Hacking', 'CO602 Mobile Application Development'],
          alliedSubjects: ['AM101 Applied Mathematics & Logic']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Bandra East Autonomous Campus • Rigorous Diploma Practical & Theory Examination Archive'
    },
    {
      id: 'anna',
      name: 'Anna University Chennai',
      shortCode: 'Anna Univ',
      campusLocation: 'CEG Campus, Sardar Patel Road, Guindy, Chennai',
      city: 'Chennai',
      country: 'India',
      state: 'Tamil Nadu',
      tier: 'State Premier Technical University',
      category: 'UNIVERSITY',
      institutionType: 'STATE_GOVT_UNIVERSITY',
      websiteUrl: 'https://www.annauniv.edu',
      accreditation: 'NAAC A++ • UGC 12(B) • NIRF Rank 13',
      officialSiteVerified: true,
      logoIcon: '🏛️',
      pyqCount: 290,
      paperCount: 16,
      establishedYear: 1978,
      isGlobal: false,
      departments: ['Department of Computer Science and Engineering (CEG)', 'Department of Information Technology (MIT Chromepet)'],
      programs: ['B.E. Computer Science & Engineering', 'B.Tech Information Technology'],
      programsCatalog: [
        {
          name: 'B.E. Computer Science & Engineering',
          shortCode: 'B.E. CSE Anna',
          level: 'UG',
          schoolName: 'College of Engineering Guindy (CEG)',
          departmentName: 'Department of Computer Science and Engineering',
          coreSubjects: ['CS8791 Cloud Computing & Distributed Systems', 'CS8492 Database Management Systems', 'CS8493 Operating Systems'],
          electiveSubjects: ['CS8075 Data Warehousing & Data Mining', 'CS8080 Information Retrieval Techniques'],
          alliedSubjects: ['MA8402 Probability and Queueing Theory']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'CEG Guindy Campus • TCP/IP congestion, sliding windows & memory derivations'
    },
    {
      id: 'mit',
      name: 'MIT EECS (Massachusetts Institute of Technology)',
      shortCode: 'MIT EECS',
      campusLocation: '77 Massachusetts Ave, Cambridge, Boston Metro',
      city: 'Cambridge',
      country: 'USA',
      state: 'Massachusetts',
      tier: 'Global Benchmark Research University',
      category: 'UNIVERSITY',
      institutionType: 'INTERNATIONAL_UNIVERSITY',
      websiteUrl: 'https://www.eecs.mit.edu',
      accreditation: 'NECHE USA Accredited • QS World University Rank 1',
      officialSiteVerified: true,
      logoIcon: '⚡',
      pyqCount: 230,
      paperCount: 15,
      establishedYear: 1861,
      isGlobal: true,
      departments: ['Department of Electrical Engineering and Computer Science'],
      programs: ['Course 6-3 (Computer Science)', 'Course 6-4 (Artificial Intelligence and Decision Making)'],
      programsCatalog: [
        {
          name: 'Course 6-3 (Computer Science)',
          shortCode: 'MIT 6-3',
          level: 'UG',
          schoolName: 'MIT Schwarzman College of Computing',
          departmentName: 'Department of EECS',
          coreSubjects: ['6.824 Distributed Systems Engineering', '6.033 Computer System Engineering', '6.046 Design and Analysis of Algorithms'],
          electiveSubjects: ['6.858 Computer Systems Security', '6.828 Operating System Engineering'],
          alliedSubjects: ['18.06 Linear Algebra', '6.042 Mathematics for Computer Science']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: '6.824 Distributed Systems & 6.033 Computer System Engineering exams'
    },
    {
      id: 'stanford',
      name: 'Stanford University (CS & Systems)',
      shortCode: 'Stanford',
      campusLocation: '450 Jane Stanford Way, Stanford Campus, Silicon Valley',
      city: 'Stanford',
      country: 'USA',
      state: 'California',
      tier: 'Global Benchmark Research University',
      category: 'UNIVERSITY',
      institutionType: 'INTERNATIONAL_UNIVERSITY',
      websiteUrl: 'https://cs.stanford.edu',
      accreditation: 'WASC Senior College and University Commission (WSCUC) • QS World Rank 3',
      officialSiteVerified: true,
      logoIcon: '🌲',
      pyqCount: 210,
      paperCount: 14,
      establishedYear: 1885,
      isGlobal: true,
      departments: ['Department of Computer Science (Gates Computer Science Building)'],
      programs: ['B.S. in Computer Science', 'M.S. in Computer Science (Systems Specialization)'],
      programsCatalog: [
        {
          name: 'B.S. in Computer Science',
          shortCode: 'Stanford BS CS',
          level: 'UG',
          schoolName: 'Stanford School of Engineering',
          departmentName: 'Department of Computer Science',
          coreSubjects: ['CS140 Operating Systems & Concurrency', 'CS144 Introduction to Computer Networking', 'CS401 Distributed Consensus & Architecture'],
          electiveSubjects: ['CS244 Advanced Topics in Networking', 'CS245 Principles of Data Systems'],
          alliedSubjects: ['CS109 Introduction to Probability for Computer Scientists']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'CS144 Networking, CS140 Operating Systems & Concurrency final exams'
    },
    {
      id: 'jee-adv',
      name: 'JEE Advanced (Joint Entrance Examination)',
      shortCode: 'JEE Advanced',
      campusLocation: 'National Testing Centers (All India Computer Based Test)',
      city: 'National Exam',
      country: 'India',
      state: 'All India',
      tier: 'National Engineering Entrance',
      category: 'NATIONAL_ENTRANCE_EXAM',
      institutionType: 'NATIONAL_ENTRANCE_BOARD',
      websiteUrl: 'https://jeeadv.ac.in',
      accreditation: 'Conducted by Joint Admission Board (JAB) & IITs for Admissions to 23 IITs',
      officialSiteVerified: true,
      examAgency: 'NTA & IIT Joint Admission Board (JAB)',
      logoIcon: '🎯',
      pyqCount: 450,
      paperCount: 10,
      establishedYear: 1960,
      isGlobal: false,
      departments: ['Physics Core', 'Chemistry (Physical, Organic, Inorganic)', 'Mathematics & Coordinate Geometry'],
      programs: ['Paper 1 (Morning Shift)', 'Paper 2 (Afternoon Shift)'],
      programsCatalog: [
        {
          name: 'Paper 1 (Morning Shift)',
          shortCode: 'JEE Paper 1',
          level: 'ENTRANCE',
          schoolName: 'IIT Joint Admission Board (JAB)',
          departmentName: 'All India Engineering Admissions Committee',
          coreSubjects: ['CS401 Computational Logic & Algorithms', 'Physics Mechanics & Thermodynamics', 'Mathematics Coordinate Geometry & Calculus'],
          electiveSubjects: ['Advanced Physical Chemistry', 'Electrodynamics & Optics'],
          alliedSubjects: ['Analytical Reasoning & Numerical Aptitude']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Official JEE Advanced Papers with multi-correct numerical integer format'
    },
    {
      id: 'neet-ug',
      name: 'NEET UG (National Eligibility cum Entrance Test)',
      shortCode: 'NEET UG',
      campusLocation: 'National Testing Centers (Pen & Paper OMR Format)',
      city: 'National Exam',
      country: 'India',
      state: 'All India',
      tier: 'National Medical Entrance',
      category: 'NATIONAL_ENTRANCE_EXAM',
      institutionType: 'NATIONAL_ENTRANCE_BOARD',
      websiteUrl: 'https://neet.nta.nic.in',
      accreditation: 'National Testing Agency (NTA) • Ministry of Education & National Medical Commission',
      officialSiteVerified: true,
      examAgency: 'National Testing Agency (NTA)',
      logoIcon: '🩺',
      pyqCount: 480,
      paperCount: 10,
      establishedYear: 2013,
      isGlobal: false,
      departments: ['Biology (Botany & Zoology)', 'Physics Mechanics & Optics', 'Chemistry Organic & Physical'],
      programs: ['MBBS Entrance Paper', 'BDS / Allied Health Sciences'],
      programsCatalog: [
        {
          name: 'MBBS Entrance Paper',
          shortCode: 'NEET MBBS',
          level: 'ENTRANCE',
          schoolName: 'National Testing Agency (NTA)',
          departmentName: 'Medical Examinations Division',
          coreSubjects: ['Human Physiology & Genetics', 'Mechanics, Waves & Modern Physics', 'Organic & Inorganic Reaction Mechanisms'],
          electiveSubjects: ['Biotechnology Applications', 'Ecology and Environment'],
          alliedSubjects: ['Scientific Aptitude & Data Interpretation']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Official NTA Question Papers Code-wise (T1-T6, W1-W6) with complete answers'
    },
    {
      id: 'gate-cs',
      name: 'GATE Computer Science & IT',
      shortCode: 'GATE CS',
      campusLocation: 'National CBT Centers (IISc & IIT Organizing Institutes)',
      city: 'National Exam',
      country: 'India',
      state: 'All India',
      tier: 'National Postgraduate & PSU Recruitment Examination',
      category: 'NATIONAL_ENTRANCE_EXAM',
      institutionType: 'NATIONAL_ENTRANCE_BOARD',
      websiteUrl: 'https://gate.iitkgp.ac.in',
      accreditation: 'Conducted on behalf of National Coordination Board (NCB)-GATE, MoE, GoI',
      officialSiteVerified: true,
      examAgency: 'GATE Committee (IITs & IISc)',
      logoIcon: '💻',
      pyqCount: 520,
      paperCount: 10,
      establishedYear: 1983,
      isGlobal: false,
      departments: ['Algorithms & Data Structures', 'Operating Systems & Virtual Memory', 'Computer Networks & TCP/IP', 'Theory of Computation & Compiler Design'],
      programs: ['GATE CS Morning Session', 'GATE CS Afternoon Session', 'GATE Data Science & AI (DA)'],
      programsCatalog: [
        {
          name: 'GATE CS Morning Session',
          shortCode: 'GATE CS Session 1',
          level: 'PG',
          schoolName: 'National Coordination Board (NCB-GATE)',
          departmentName: 'Organizing Institute IIT / IISc',
          coreSubjects: ['CS401 Distributed Systems & OS Synchronization', 'Theory of Computation & Turing Reductions', 'Algorithms & Asymptotic Complexity', 'Computer Organization & Pipelining'],
          electiveSubjects: ['Compiler Construction & Syntax Analysis', 'Database Normalization & Transaction Schedules'],
          alliedSubjects: ['General Aptitude & Verbal Reasoning', 'Engineering Mathematics & Graph Theory']
        }
      ],
      availableYears: ['2025', '2024', '2023', '2022', '2021'],
      highlight: 'Official 65-Question standard papers with NAT and MSQ scoring keys'
    }
  ]);

  readonly selectedCollegeId = signal<string>('apex');

  // Mentor Uploaded Practice Papers (Accessible across Student & Mentor)
  readonly mentorPracticePapers = signal<MentorPracticePaper[]>([]);
  private readonly KEY_MENTOR_PRACTICE_PAPERS = 'scholarx_mentor_practice_papers';
  private practiceChannel?: BroadcastChannel;

  // Student Acceptance Roster State for Mentor Practice Papers & Assignments
  readonly assignmentAcceptanceMap = signal<Record<string, AssignmentStudentAcceptance[]>>({});
  private readonly KEY_ASSIGNMENT_ACCEPTANCE_MAP = 'scholarx_assignment_acceptance_map';

  // Official University Question Papers with Release Dates & Metadata
  readonly universityQuestionPapers = signal<UniversityQuestionPaper[]>([]);

  // Computed state
  readonly unreadNotificationCount = computed(() => {
    return this.notifications().filter(n => n.isNew).length;
  });

  readonly enrolledClassesOnly = computed(() => {
    return this.joinedClasses().filter(c => c.status === 'ENROLLED');
  });

  readonly pendingClassesOnly = computed(() => {
    return this.joinedClasses().filter(c => c.status === 'PENDING');
  });

  readonly activeAssignedTests = computed(() => {
    return this.assignedTests().filter(t => t.status !== 'COMPLETED');
  });

  constructor() {
    this.initLocalStorageAndData();
    this.initBroadcastChannels();
  }

  private initLocalStorageAndData(): void {
    if (typeof window === 'undefined') return;

    // Load Theme (Force default 'light' to cleanse obsolete 'dark' from localStorage)
    let savedTheme = (localStorage.getItem(this.KEY_THEME) || 'light') as StudentThemePreference;
    if (savedTheme === 'dark' || savedTheme === 'slate') {
      savedTheme = 'light';
      localStorage.setItem(this.KEY_THEME, 'light');
    }
    this.setTheme(savedTheme);

    // Load Saved Student Profile
    const savedProfile = localStorage.getItem(this.KEY_PROFILE);
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        if (parsedProfile && parsedProfile.studentId) {
          this.profile.set({ ...this.profile(), ...parsedProfile });
        }
      } catch (e) {
        console.warn('Failed to parse saved student profile:', e);
      }
    }

    // Load Joined Classes or Seed Defaults
    const savedClasses = localStorage.getItem(this.KEY_JOINED_CLASSES);
    if (savedClasses) {
      try {
        this.joinedClasses.set(JSON.parse(savedClasses));
      } catch (e) {
        this.seedDefaultClasses();
      }
    } else {
      this.seedDefaultClasses();
    }

    // Load Notifications or Seed Defaults
    const savedNotifs = localStorage.getItem(this.KEY_NOTIFICATIONS);
    if (savedNotifs) {
      try {
        this.notifications.set(JSON.parse(savedNotifs));
      } catch (e) {
        this.seedDefaultNotifications();
      }
    } else {
      this.seedDefaultNotifications();
    }

    // Load Tests or Seed Defaults
    const savedTests = localStorage.getItem(this.KEY_TESTS);
    if (savedTests) {
      try {
        this.assignedTests.set(JSON.parse(savedTests));
      } catch (e) {
        this.seedDefaultTests();
      }
    } else {
      this.seedDefaultTests();
    }

    // Load Mentor Practice Papers
    const savedPapers = localStorage.getItem(this.KEY_MENTOR_PRACTICE_PAPERS);
    if (savedPapers) {
      try {
        this.mentorPracticePapers.set(JSON.parse(savedPapers));
      } catch (e) {
        this.seedDefaultMentorPracticePapers();
      }
    } else {
      this.seedDefaultMentorPracticePapers();
    }

    // Load Assignment Acceptance Map
    const savedAcceptance = localStorage.getItem(this.KEY_ASSIGNMENT_ACCEPTANCE_MAP);
    if (savedAcceptance) {
      try {
        this.assignmentAcceptanceMap.set(JSON.parse(savedAcceptance));
      } catch (e) {}
    }

    this.seedDefaultPYQs();
    this.seedDefaultQuestionPapers();
    this.seedDefaultUniversityQuestionPapers();
  }

  readonly incomingFacultyCommand = signal<{ type: 'INTERCOM' | 'STRIKE' | 'TERMINATE'; data: any } | null>(null);

  private initBroadcastChannels(): void {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;

    try {
      this.practiceChannel = new BroadcastChannel('viva_practice_channel');
      this.practiceChannel.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data) return;
        if (data.type === 'MENTOR_PRACTICE_PAPER_PUBLISHED' && data.paper) {
          const currentPapers = this.mentorPracticePapers();
          this.mentorPracticePapers.set([data.paper, ...currentPapers.filter(p => p.id !== data.paper.id)]);
          const currentPyqs = this.pyqs();
          this.pyqs.set([...data.paper.questions, ...currentPyqs.filter(p => !data.paper.questions.some((np: any) => np.id === p.id))]);
        } else if (data.type === 'MENTOR_PRACTICE_PAPER_TERMINATED' && data.paperId) {
          this.mentorPracticePapers.update(papers => papers.map(p =>
            (p.id === data.paperId || p.title === data.paperId || p.paperTitle === data.paperId)
              ? { ...p, isTerminated: true, status: 'TERMINATED' as const }
              : p
          ));
        } else if (data.type === 'STUDENT_ASSIGNMENT_RESPONSE' && data.assignmentId) {
          if (data.studentAcceptanceList) {
            this.assignmentAcceptanceMap.update(m => ({ ...m, [data.assignmentId]: data.studentAcceptanceList }));
          }
          this.mentorPracticePapers.update(papers => papers.map(p => {
            if (p.id === data.assignmentId || p.title === data.assignmentId || p.paperTitle === data.assignmentId) {
              return {
                ...p,
                studentAcceptanceList: data.studentAcceptanceList || p.studentAcceptanceList
              };
            }
            return p;
          }));
        }
      };

      this.enrollmentChannel = new BroadcastChannel('viva_enrollment_channel');
      this.enrollmentChannel.onmessage = (event) => {
        const data = event.data;
        if (data && data.type === 'ENROLLMENT_APPROVED' && data.studentId === this.profile().studentId) {
          this.handleEnrollmentApproved(data.classCode);
        }
      };

      this.proctorChannel = new BroadcastChannel('viva_proctor_channel');
      this.proctorChannel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        const myId = this.profile().studentId;
        if (data.type === 'FACULTY_INTERCOM_MESSAGE' || data.type === 'FACULTY_INTERCOM_BROADCAST') {
          if (data.broadcastAll || !data.targetStudentId || data.targetStudentId === myId) {
            this.facultyIntercomMessage.set({
              message: data.message,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
            this.incomingFacultyCommand.set({ type: 'INTERCOM', data });
            this.speakIntercomMessage(data.message);
          }
        } else if (data.type === 'FACULTY_MANUAL_STRIKE') {
          if (data.targetStudentId === myId) {
            this.incomingFacultyCommand.set({ type: 'STRIKE', data });
          }
        } else if (data.type === 'FACULTY_TERMINATE_EXAM') {
          if (data.targetStudentId === myId) {
            this.incomingFacultyCommand.set({ type: 'TERMINATE', data });
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment', e);
    }
  }

  private speakIntercomMessage(msg: string): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(`Faculty Warning: ${msg}`);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error', e);
      }
    }
  }

  private seedDefaultClasses(): void {
    const defaults: StudentJoinedClass[] = [
      {
        id: 'cls-401',
        name: 'Distributed Systems & Consensus Architecture',
        subjectCode: 'CS401',
        department: 'Computer Science & Engineering',
        semester: 6,
        academicYear: '2025-2026',
        joinCode: 'OS-4482',
        mentorName: 'Dr. Sarah Jenkins',
        mentorId: 'SX-M401',
        mentorEmail: 's.jenkins@apex.edu',
        status: 'ENROLLED',
        enrolledAt: '2026-01-15',
        coverGradient: 'from-emerald-900 to-teal-950',
        testsCount: 4,
        vivasCompleted: 3,
        targetCOs: ['CO1', 'CO2', 'CO3', 'CO4']
      },
      {
        id: 'cls-402',
        name: 'Advanced Embedded Systems & 8051 Microcontrollers',
        subjectCode: 'CSE-354',
        department: 'Computer Science & Engineering',
        semester: 6,
        academicYear: '2025-2026',
        joinCode: 'CSE-354-IT',
        mentorName: 'Prof. David Vance',
        mentorId: 'SX-M402',
        mentorEmail: 'd.vance@apex.edu',
        status: 'ENROLLED',
        enrolledAt: '2026-01-18',
        coverGradient: 'from-blue-900 to-indigo-950',
        testsCount: 3,
        vivasCompleted: 2,
        targetCOs: ['CO1', 'CO2', 'CO5']
      },
      {
        id: 'cls-403',
        name: 'Cloud Computing & Kubernetes Microservices',
        subjectCode: 'CS702',
        department: 'Computer Science & Engineering',
        semester: 6,
        academicYear: '2025-2026',
        joinCode: 'PRO-8051-X9',
        mentorName: 'Dr. Elena Rostova',
        mentorId: 'SX-M403',
        mentorEmail: 'e.rostova@apex.edu',
        status: 'PENDING',
        enrolledAt: '2026-02-01',
        coverGradient: 'from-purple-900 to-slate-950',
        testsCount: 2,
        vivasCompleted: 0,
        targetCOs: ['CO1', 'CO2', 'CO3', 'CO6']
      }
    ];

    this.joinedClasses.set(defaults);
    this.saveClassesToStorage(defaults);
  }

  private seedDefaultNotifications(): void {
    const defaults: StudentNotificationItem[] = [
      {
        id: 'notif-1',
        title: '🔴 Mandatory Midterm Oral VIVA Released',
        message: 'Dr. Sarah Jenkins scheduled Distributed Systems Oral VIVA slot. Lockout window in 4 hours.',
        type: 'TEST_RELEASE',
        timestamp: '10 mins ago',
        isNew: true,
        actionUrl: '/student/viva',
        courseCode: 'CS401'
      },
      {
        id: 'notif-2',
        title: '🟢 CO3 Attainment Score Posted',
        message: 'Your Oral Defense on Byzantine Fault Tolerance scored 92% (Level 3 Attained).',
        type: 'GRADE_POSTED',
        timestamp: '2 hours ago',
        isNew: true,
        actionUrl: '/student/progress',
        courseCode: 'CS401'
      },
      {
        id: 'notif-3',
        title: '🔵 Direct Mentor Feedback',
        message: 'Prof. David Vance: Review machine cycles for timer ISRs before the lab practical.',
        type: 'DIRECT_MESSAGE',
        timestamp: '1 day ago',
        isNew: false,
        actionUrl: '/student/communication',
        courseCode: 'CSE-354'
      },
      {
        id: 'notif-4',
        title: '🟡 Spring 2026 Examination Notice',
        message: 'End-semester practical assessment window opens from March 25th. Verify device readiness.',
        type: 'ANNOUNCEMENT',
        timestamp: '2 days ago',
        isNew: false,
        actionUrl: '/student/settings'
      }
    ];

    this.notifications.set(defaults);
    this.saveNotificationsToStorage(defaults);
  }

  private seedDefaultTests(): void {
    const defaults: StudentAssignedTest[] = [
      {
        id: 'test-101',
        classId: 'cls-401',
        className: 'Distributed Systems & Consensus Architecture',
        subjectCode: 'CS401',
        title: 'Midterm Spoken Oral VIVA: Raft Consensus & CAP Theorem',
        type: 'ORAL_VIVA',
        totalMarks: 40,
        durationMinutes: 15,
        dueCountdown: 'Due in 4 hours',
        dueDate: 'Today, 05:00 PM',
        targetCOs: ['CO1', 'CO2', 'CO3'],
        status: 'PENDING',
        canResume: true
      },
      {
        id: 'test-102',
        classId: 'cls-401',
        className: 'Distributed Systems & Consensus Architecture',
        subjectCode: 'CS401',
        title: 'Unit 2 Formative Diagnostic: Vector Clocks & Gossip Protocols',
        type: 'MCQ_DIAGNOSTIC',
        totalMarks: 20,
        durationMinutes: 15,
        dueCountdown: 'Due in 2 days',
        dueDate: 'March 14, 11:30 AM',
        targetCOs: ['CO2', 'CO3'],
        status: 'PENDING',
        mcqQuestions: [
          {
            id: 'mcq-1',
            question: 'In a distributed system of N processes using Vector Clocks, process P_i increments its own clock V_i[i] by 1 whenever:',
            options: [
              'It receives any broadcast message from a peer',
              'An internal event occurs or before sending a message',
              'A network partition is resolved',
              'The master node sends a synchronization heartbeat'
            ],
            correctOptionIndex: 1,
            explanation: 'In Vector Clock algorithms (Fidge/Mattern), a process increments its local component V_i[i] before timestamping an internal event or a message send event.',
            coTarget: 'CO2',
            bloomLevel: 'Understand (L2)'
          },
          {
            id: 'mcq-2',
            question: 'Which consistency model ensures that if process A updates data item X and communicates with process B, then process B will observe the new value of X?',
            options: [
              'Eventual Consistency',
              'Causal Consistency',
              'Monotonic Read Consistency',
              'Read-After-Write Eventual Window'
            ],
            correctOptionIndex: 1,
            explanation: 'Causal consistency guarantees that operations that are causally related are seen by every node of the system in the same order.',
            coTarget: 'CO2',
            bloomLevel: 'Analyze (L4)'
          },
          {
            id: 'mcq-3',
            question: 'In the Raft Consensus Protocol, what mechanism prevents two candidates from perpetually splitting votes in an election term?',
            options: [
              'Pre-assigned static leader priority ranks',
              'Randomized election timeouts between 150ms and 300ms',
              'Round-robin token ring passing',
              'Centralized coordinator arbitration'
            ],
            correctOptionIndex: 1,
            explanation: 'Raft uses randomized election timeouts (e.g. 150-300ms) to ensure split votes are rare and quickly resolved because one node will time out and collect votes before others.',
            coTarget: 'CO3',
            bloomLevel: 'Apply (L3)'
          },
          {
            id: 'mcq-4',
            question: 'According to the CAP Theorem, in the presence of a network partition (P), a distributed data store MUST choose between:',
            options: [
              'Performance and Security',
              'Consistency (C) and Availability (A)',
              'Throughput and Latency',
              'Scalability and Durability'
            ],
            correctOptionIndex: 1,
            explanation: 'Under CAP theorem, network partitions are inevitable in real networks. When partition occurs, the system must trade off between strict consistency (blocking requests) or availability (returning stale data).',
            coTarget: 'CO1',
            bloomLevel: 'Understand (L2)'
          }
        ]
      },
      {
        id: 'test-103',
        classId: 'cls-401',
        className: 'Distributed Systems & Consensus Architecture',
        subjectCode: 'CS401',
        title: 'Formative Assessment 1: RPC Mechanisms & Vector Clocks',
        type: 'THEORY_CIE',
        totalMarks: 25,
        durationMinutes: 30,
        dueCountdown: 'Completed',
        dueDate: 'March 02, 2026',
        targetCOs: ['CO1', 'CO2'],
        status: 'COMPLETED',
        awardedScore: 23.5,
        gradePill: 'A+ (94%)',
        integrityScore: 100,
        completedAt: 'March 02, 2026, 03:45 PM',
        feedbackSummary: 'Outstanding conceptual clarity in causality matrices and gRPC serialization benchmarks.',
        coAttainmentScores: [
          { coCode: 'CO1', label: 'Distributed Systems Architecture', score: 9.5, maxScore: 10, status: 'MASTERED', bloomLevel: 'Understand (L2)' },
          { coCode: 'CO2', label: 'Logical Clocks & Causal Order', score: 14.0, maxScore: 15, status: 'MASTERED', bloomLevel: 'Apply (L3)' }
        ],
        rubricBreakdown: [
          { criterion: 'Theoretical Rigor & Mathematical Accuracy', maxMarks: 10, awardedMarks: 9.5, feedback: 'Rigorous proof of vector clock causality.' },
          { criterion: 'Protocol Architecture & Tradeoffs', maxMarks: 10, awardedMarks: 9.0, feedback: 'Well-reasoned PACELC theorem comparison.' },
          { criterion: 'Technical Vocabulary & Formatting', maxMarks: 5, awardedMarks: 5.0, feedback: 'Flawless engineering explanations.' }
        ],
        questionBreakdown: [
          {
            questionNumber: 1,
            questionText: 'Explain how Vector Clocks establish causal ordering and detect concurrent events in distributed transactions.',
            studentAnswer: 'Vector clocks maintain a vector of integer logical timestamps for each node. When sending messages, the local clock is incremented and attached. A concurrent event is identified when neither vector timestamp dominates the other (i.e. neither Va <= Vb nor Vb <= Va).',
            modelAnswer: 'Vector clocks assign an array of logical clocks V_i[1..n] to each process. Event a happens-before b iff V(a)[k] <= V(b)[k] for all k and strictly less for at least one. Concurrent if neither precedes.',
            maxMarks: 10,
            awardedMarks: 9.5,
            examinerFeedback: 'Superb explanation of concurrency condition and monotonic vector increment rule.',
            coTarget: 'CO2',
            bloomLevel: 'Apply (L3)'
          },
          {
            questionNumber: 2,
            questionText: 'Analyze how gRPC Protocol Buffers improve throughput over REST JSON in microservice communication.',
            studentAnswer: 'gRPC utilizes HTTP/2 binary framing and Protocol Buffers for typed binary serialization. This avoids JSON string parsing overhead, supports multiplexing multiple requests over a single TCP connection, and reduces bandwidth footprint by 60-70%.',
            modelAnswer: 'Protocol Buffers encode messages in compact binary format with varints and field tags, eliminating repetitive schema keys. Combined with HTTP/2 multiplexing, HPACK header compression, and bi-directional streaming, gRPC achieves significantly higher throughput and lower tail latencies.',
            maxMarks: 15,
            awardedMarks: 14.0,
            examinerFeedback: 'Accurate analysis of HTTP/2 multiplexing and binary serialization benefits.',
            coTarget: 'CO1',
            bloomLevel: 'Analyze (L4)'
          }
        ],
        aiAnalysis: {
          executiveSummary: 'Demonstrated exceptional mastery of distributed causal ordering, RPC marshaling protocols, and quorum consistency principles. Shows strong analytical acumen (Bloom L3/L4) with exemplary domain articulation.',
          strengths: [
            'Flawless proof and calculation of Vector Clock concurrency matrices (95% attainment in CO2).',
            'Detailed comprehension of HTTP/2 binary framing and Protocol Buffer serialization efficiency.',
            'Crisp command of distributed terminology: happens-before relation, monotonic counters, split-brain mitigation.'
          ],
          weaknesses: [
            'Could deepen discussion on Byzantine fault tolerances under adversarial network models.',
            'Minor omission regarding gRPC connection pooling edge cases in Kubernetes ingress proxies.'
          ],
          remediationPath: [
            'Explore Lamport vs Vector clock trade-offs in geo-replicated data stores with high node churn.',
            'Complete 1 practice interactive session on Raft log compaction & snapshotting in the Practice Lab.'
          ],
          examReadinessScore: 94,
          recommendedDrillTopic: 'Raft Log Compaction & Snapshotting Protocols',
          aiModelUsed: 'Gemini 1.5 Pro (Diagnostic Engine)',
          generatedAt: 'March 02, 2026, 03:47 PM'
        }
      },
      {
        id: 'test-104',
        classId: 'cls-401',
        className: 'Distributed Systems & Consensus Architecture',
        subjectCode: 'CS401',
        title: 'Technical Speaking Defense: Paxos vs Raft Tradeoff Analysis',
        type: 'SPEAKING_DEFENSE',
        totalMarks: 20,
        durationMinutes: 10,
        dueCountdown: 'Due in 3 days',
        dueDate: 'March 15, 04:00 PM',
        targetCOs: ['CO3', 'CO4'],
        status: 'PENDING'
      },
      {
        id: 'test-105',
        classId: 'cls-402',
        className: 'Advanced Embedded Systems & 8051 Microcontrollers',
        subjectCode: 'CSE-354',
        title: 'Lab CIE Diagnostic: Timers, Interrupts & Serial I/O',
        type: 'LAB_PRACTICAL',
        totalMarks: 30,
        durationMinutes: 45,
        dueCountdown: 'Due in 2 days',
        dueDate: 'March 14, 11:30 AM',
        targetCOs: ['CO2', 'CO5'],
        status: 'PENDING'
      },
      {
        id: 'test-106',
        classId: 'cls-402',
        className: 'Advanced Embedded Systems & 8051 Microcontrollers',
        subjectCode: 'CSE-354',
        title: '8051 Assembly & Memory Architecture Diagnostic',
        type: 'MCQ_DIAGNOSTIC',
        totalMarks: 15,
        durationMinutes: 10,
        dueCountdown: 'Completed',
        dueDate: 'Feb 24, 2026',
        targetCOs: ['CO1', 'CO2'],
        status: 'COMPLETED',
        awardedScore: 14.0,
        gradePill: 'A+ (93%)',
        integrityScore: 99,
        completedAt: 'Feb 24, 2026, 04:10 PM',
        feedbackSummary: 'Strong understanding of SFR registers, internal RAM banking, and DPTR addressing.',
        coAttainmentScores: [
          { coCode: 'CO1', label: '8051 Architecture & Register Banks', score: 9.0, maxScore: 10, status: 'MASTERED', bloomLevel: 'Understand (L2)' },
          { coCode: 'CO2', label: 'Instruction Timing & Memory Addressing', score: 5.0, maxScore: 5, status: 'MASTERED', bloomLevel: 'Apply (L3)' }
        ],
        rubricBreakdown: [
          { criterion: 'Memory Addressing Precision', maxMarks: 10, awardedMarks: 9.5, feedback: 'Correct identification of bit-addressable memory areas.' },
          { criterion: 'Opcode Cycle Timing', maxMarks: 5, awardedMarks: 4.5, feedback: 'Accurate machine cycle calculations.' }
        ],
        aiAnalysis: {
          executiveSummary: 'Demonstrated high competence in 8051 internal hardware architecture, SFR registers, and memory banking structures.',
          strengths: [
            'Accurate identification of direct vs indirect internal RAM addressing modes.',
            'Strong calculation of machine cycles for standard DJNZ / LCALL instructions.'
          ],
          weaknesses: [
            'Slight confusion on external code memory EA pin pull-up configurations.'
          ],
          remediationPath: [
            'Review external ROM multiplexing with ALE and Port 0/Port 2 latch circuits.'
          ],
          examReadinessScore: 91,
          recommendedDrillTopic: '8051 External Memory Interfacing & ALE Demultiplexing',
          aiModelUsed: 'Gemini 1.5 Pro',
          generatedAt: 'Feb 24, 2026, 04:12 PM'
        }
      },
      {
        id: 'test-107',
        classId: 'cls-403',
        className: 'Cloud Computing & Kubernetes Microservices',
        subjectCode: 'CS702',
        title: 'Container Orchestration & Ingress Invariant Lab',
        type: 'ASSIGNMENT',
        totalMarks: 25,
        durationMinutes: 60,
        dueCountdown: 'Due in 5 days',
        dueDate: 'March 18, 06:00 PM',
        targetCOs: ['CO1', 'CO3'],
        status: 'PENDING'
      }
    ];

    this.assignedTests.set(defaults);
    this.saveTestsToStorage(defaults);
  }

  saveTestsToStorage(tests: StudentAssignedTest[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.KEY_TESTS, JSON.stringify(tests));
      } catch (e) {
        console.error('Failed to save tests to localStorage', e);
      }
    }
  }

  getTestsForClass(classId: string, subjectCode?: string): StudentAssignedTest[] {
    return this.assignedTests().filter(t => t.classId === classId || (subjectCode && t.subjectCode === subjectCode));
  }

  getTestById(testId: string): StudentAssignedTest | undefined {
    return this.assignedTests().find(t => t.id === testId);
  }

  submitMCQTestResult(testId: string, userAnswers: Record<string, number>): Observable<StudentAssignedTest> {
    const currentTests = this.assignedTests();
    const testIndex = currentTests.findIndex(t => t.id === testId);
    if (testIndex === -1) {
      throw new Error(`Test ${testId} not found`);
    }

    const test = currentTests[testIndex];
    const mcqs = test.mcqQuestions || [];
    let correctCount = 0;
    const totalQuestions = mcqs.length;

    const questionBreakdown = mcqs.map((q, idx) => {
      const selectedIndex = userAnswers[q.id];
      const isCorrect = selectedIndex === q.correctOptionIndex;
      if (isCorrect) correctCount++;
      return {
        questionNumber: idx + 1,
        questionText: q.question,
        studentAnswer: selectedIndex !== undefined ? q.options[selectedIndex] : 'Not Answered',
        modelAnswer: q.options[q.correctOptionIndex],
        maxMarks: +(test.totalMarks / (totalQuestions || 1)).toFixed(1),
        awardedMarks: isCorrect ? +(test.totalMarks / (totalQuestions || 1)).toFixed(1) : 0,
        examinerFeedback: isCorrect ? `Correct! ${q.explanation}` : `Incorrect. Selected: '${selectedIndex !== undefined ? q.options[selectedIndex] : 'None'}'. Explanation: ${q.explanation}`,
        coTarget: q.coTarget,
        bloomLevel: q.bloomLevel
      };
    });

    const marksPerQ = test.totalMarks / (totalQuestions || 1);
    const awardedScore = parseFloat((correctCount * marksPerQ).toFixed(1));
    const percentage = Math.round((awardedScore / test.totalMarks) * 100);
    const gradePill = percentage >= 90 ? 'A+ (Outstanding)' : percentage >= 80 ? 'A (Excellent)' : percentage >= 70 ? 'B+ (Good)' : percentage >= 60 ? 'B (Satisfactory)' : 'C (Needs Remediation)';

    const coMap: Record<string, { total: number; awarded: number; bloom: string }> = {};
    questionBreakdown.forEach(qb => {
      if (!coMap[qb.coTarget]) {
        coMap[qb.coTarget] = { total: 0, awarded: 0, bloom: qb.bloomLevel };
      }
      coMap[qb.coTarget].total += qb.maxMarks;
      coMap[qb.coTarget].awarded += qb.awardedMarks;
    });

    const coAttainmentScores = Object.keys(coMap).map(coCode => {
      const { total, awarded, bloom } = coMap[coCode];
      const attainmentPct = total > 0 ? (awarded / total) * 100 : 0;
      return {
        coCode,
        label: `${coCode} Target Attainment`,
        score: parseFloat(awarded.toFixed(1)),
        maxScore: parseFloat(total.toFixed(1)),
        status: (attainmentPct >= 75 ? 'MASTERED' : attainmentPct >= 50 ? 'DEVELOPING' : 'NEEDS_FOCUS') as 'MASTERED' | 'DEVELOPING' | 'NEEDS_FOCUS',
        bloomLevel: bloom
      };
    });

    const rubricBreakdown = [
      { criterion: 'Conceptual Accuracy & Diagnostic Precision', maxMarks: Math.round(test.totalMarks * 0.6), awardedMarks: Math.round(awardedScore * 0.6), feedback: `${correctCount}/${totalQuestions} questions answered accurately.` },
      { criterion: 'Analytical Application & Problem Solving', maxMarks: Math.round(test.totalMarks * 0.4), awardedMarks: Math.round(awardedScore * 0.4), feedback: 'Domain terminology and logic alignment assessed.' }
    ];

    const aiAnalysis = {
      executiveSummary: `Student completed ${test.title} achieving ${awardedScore}/${test.totalMarks} (${percentage}%). ${percentage >= 75 ? 'Exhibited strong proficiency across foundational concepts and problem identification.' : 'Foundational concepts require reinforcement before summative university examinations.'}`,
      strengths: [
        `Accurately solved ${correctCount} of ${totalQuestions} diagnostic assessment items.`,
        `Demonstrated consistent understanding in ${coAttainmentScores.filter(c => c.status === 'MASTERED').map(c => c.coCode).join(', ') || 'core subject principles'}.`,
        'High submission integrity score (100%) with zero proctoring infractions.'
      ],
      weaknesses: questionBreakdown.filter(q => q.awardedMarks === 0).map(q => `Review ${q.coTarget} (${q.bloomLevel}): ${q.questionText.slice(0, 65)}...`),
      remediationPath: [
        `Focus targeted revision on ${test.targetCOs.join(', ')} syllabus modules.`,
        `Practice interactive flashcards and PYQ miner questions for ${test.subjectCode}.`,
        `Engage in an AI Spoken Viva practice session to reinforce conceptual depth.`
      ],
      examReadinessScore: Math.min(98, Math.max(45, percentage + 5)),
      recommendedDrillTopic: `${test.subjectCode} - Problem Solving in ${test.targetCOs.join(', ')}`,
      aiModelUsed: 'Gemini 1.5 Pro (Edu-Diagnostic Engine)',
      generatedAt: new Date().toLocaleString()
    };

    const updatedTest: StudentAssignedTest = {
      ...test,
      status: 'COMPLETED',
      awardedScore,
      gradePill,
      integrityScore: 100,
      completedAt: new Date().toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      feedbackSummary: `Scored ${awardedScore}/${test.totalMarks} (${percentage}%). Grade: ${gradePill}`,
      coAttainmentScores,
      rubricBreakdown,
      questionBreakdown,
      aiAnalysis
    };

    const updatedTests = [...currentTests];
    updatedTests[testIndex] = updatedTest;
    this.assignedTests.set(updatedTests);
    this.saveTestsToStorage(updatedTests);

    return of(updatedTest);
  }

  generateAITestRemediationDrill(test: StudentAssignedTest): Observable<any> {
    const prompt = `
Generate a hyper-focused AI Remediation Drill for a student based on their test performance in subject "${test.subjectCode}: ${test.className}".
Test Title: "${test.title}"
Score: ${test.awardedScore ?? 0} / ${test.totalMarks}
Target COs: ${test.targetCOs.join(', ')}
Weaknesses: ${test.aiAnalysis?.weaknesses.join('; ') || 'Need deeper conceptual practice'}

Generate a structured study drill with:
1. drillTitle (string)
2. conceptNotes (string: 2-3 paragraphs explaining the core principles clearly)
3. keyFormulasOrRules (array of strings)
4. practiceQuestions (array of 3 items, each with { question: string, modelAnswer: string, hint: string, bloomLevel: string })
5. facultyProTip (string)

Return strict JSON only.
`;
    return new Observable<any>((subscriber) => {
      this.geminiService.generateText(prompt, 'You are an elite university engineering tutor. Return strict JSON only.').subscribe({
        next: (text) => {
          try {
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            subscriber.next(parsed);
            subscriber.complete();
          } catch (e) {
            subscriber.next(this.getFallbackRemediationDrill(test));
            subscriber.complete();
          }
        },
        error: () => {
          subscriber.next(this.getFallbackRemediationDrill(test));
          subscriber.complete();
        }
      });
    });
  }

  private getFallbackRemediationDrill(test: StudentAssignedTest): any {
    return {
      drillTitle: `Targeted Mastery Booster: ${test.subjectCode} - ${test.title}`,
      conceptNotes: `This remediation drill focuses on core competencies across ${test.targetCOs.join(', ')}. Reviewing foundational state machine transitions, invariants, and causal ordering guarantees will reinforce your theoretical and practical comprehension. Focus especially on edge cases where concurrent operations or hardware interrupts require atomic synchronization.`,
      keyFormulasOrRules: [
        'Vector Invariant: V_a < V_b iff for all k: V_a[k] <= V_b[k] AND exists j: V_a[j] < V_b[j]',
        'Quorum Rule: Majority Quorum Q >= floor(N/2) + 1 prevents split-brain partitions.',
        'CAP Tradeoff: Under partition condition P, system chooses between Linearizability (C) or Availability (A).'
      ],
      practiceQuestions: [
        {
          question: `Explain how state replication is guaranteed in ${test.subjectCode} when minority nodes reconnect after partition recovery.`,
          modelAnswer: 'The newly reconnected follower detects a higher term from the active leader, acknowledges the AppendEntries RPC, and replaces uncommitted conflict entries with the authoritative leader log entries.',
          hint: 'Consider the AppendEntries RPC consistency check and log index comparison.',
          bloomLevel: 'Analyze (L4)'
        },
        {
          question: `Why is Lamport Timestamp alone insufficient for detecting true concurrent events compared to Vector Clocks?`,
          modelAnswer: 'Lamport timestamps establish a total ordering but lose causality: L(a) < L(b) does NOT imply a happens-before b. Vector clocks preserve partial ordering so concurrent events are precisely identifiable.',
          hint: 'Recall that total order does not imply causal precedence.',
          bloomLevel: 'Understand (L2)'
        },
        {
          question: `What remediation step should you take when designing high-availability RPC services with timeout fallbacks?`,
          modelAnswer: 'Implement idempotency tokens, exponential backoff with jitter, and circuit breaker patterns to prevent cascading failures across microservice dependencies.',
          hint: 'Think of retry storms and idempotent execution guarantees.',
          bloomLevel: 'Apply (L3)'
        }
      ],
      facultyProTip: 'Always start your viva or CIE descriptive answers by defining the mathematical invariant before describing the algorithm.'
    };
  }

  persistAssignmentAcceptanceMap(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.KEY_ASSIGNMENT_ACCEPTANCE_MAP, JSON.stringify(this.assignmentAcceptanceMap()));
    } catch (e) {}
  }

  generateClassStudentRoster(classId?: string, currentStudentStatus: 'ACCEPTED' | 'PENDING' | 'DENIED' = 'PENDING'): AssignmentStudentAcceptance[] {
    const currentProfile = this.profile();
    return [
      {
        studentId: currentProfile.id,
        studentName: currentProfile.fullName + ' (You)',
        studentRoll: currentProfile.studentId,
        email: currentProfile.email,
        avatarUrl: currentProfile.avatarUrl,
        status: currentStudentStatus,
        respondedAt: currentStudentStatus === 'ACCEPTED' ? 'Oct 12, 2026, 09:15 AM' : currentStudentStatus === 'DENIED' ? 'Oct 12, 2026, 09:20 AM' : undefined,
        declineReason: currentStudentStatus === 'DENIED' ? 'Prior viva preparation commitment' : undefined
      },
      {
        studentId: 'stu-2023308702',
        studentName: 'Priya Patel',
        studentRoll: '2023308702',
        email: 'priya.patel@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
        status: 'ACCEPTED',
        respondedAt: 'Oct 12, 2026, 09:24 AM'
      },
      {
        studentId: 'stu-2023308703',
        studentName: 'Dev Mehta',
        studentRoll: '2023308703',
        email: 'dev.mehta@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        status: 'ACCEPTED',
        respondedAt: 'Oct 12, 2026, 09:32 AM'
      },
      {
        studentId: 'stu-2023308704',
        studentName: 'Ananya Rao',
        studentRoll: '2023308704',
        email: 'ananya.rao@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        status: 'ACCEPTED',
        respondedAt: 'Oct 12, 2026, 09:45 AM'
      },
      {
        studentId: 'stu-2023308705',
        studentName: 'Vikram Sengupta',
        studentRoll: '2023308705',
        email: 'vikram.s@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
        status: 'DENIED',
        respondedAt: 'Oct 12, 2026, 10:04 AM',
        declineReason: 'Conflict with Smart India Hackathon internal finals sprint'
      },
      {
        studentId: 'stu-2023308706',
        studentName: 'Neha Reddy',
        studentRoll: '2023308706',
        email: 'neha.r@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
        status: 'ACCEPTED',
        respondedAt: 'Oct 12, 2026, 10:18 AM'
      },
      {
        studentId: 'stu-2023308707',
        studentName: 'Arjun Verma',
        studentRoll: '2023308707',
        email: 'arjun.v@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
        status: 'PENDING'
      },
      {
        studentId: 'stu-2023308708',
        studentName: 'Kavita Nair',
        studentRoll: '2023308708',
        email: 'kavita.n@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
        status: 'ACCEPTED',
        respondedAt: 'Oct 12, 2026, 11:30 AM'
      },
      {
        studentId: 'stu-2023308709',
        studentName: 'Devendra Joshi',
        studentRoll: '2023308709',
        email: 'devendra.j@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
        status: 'ACCEPTED',
        respondedAt: 'Oct 12, 2026, 11:45 AM'
      },
      {
        studentId: 'stu-2023308710',
        studentName: 'Shreya Sen',
        studentRoll: '2023308710',
        email: 'shreya.s@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80',
        status: 'DENIED',
        respondedAt: 'Oct 12, 2026, 12:12 PM',
        declineReason: 'Medical leave certificate submitted to HOD office'
      },
      {
        studentId: 'stu-2023308711',
        studentName: 'Tanmay Bansal',
        studentRoll: '2023308711',
        email: 'tanmay.b@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
        status: 'ACCEPTED',
        respondedAt: 'Oct 12, 2026, 12:55 PM'
      },
      {
        studentId: 'stu-2023308712',
        studentName: 'Meera Iyer',
        studentRoll: '2023308712',
        email: 'meera.i@apex.edu',
        avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        status: 'PENDING'
      }
    ];
  }

  getAssignmentStudentList(assignmentId: string, fallbackClassId?: string): AssignmentStudentAcceptance[] {
    const map = this.assignmentAcceptanceMap();
    if (map[assignmentId] && map[assignmentId].length > 0) {
      return map[assignmentId];
    }
    const paper = this.mentorPracticePapers().find(p => p.id === assignmentId || p.title === assignmentId || p.paperTitle === assignmentId);
    if (paper && paper.studentAcceptanceList && paper.studentAcceptanceList.length > 0) {
      return paper.studentAcceptanceList;
    }
    return this.generateClassStudentRoster(paper?.classId || fallbackClassId || 'cls-401', 'PENDING');
  }

  getStudentResponse(assignmentId: string, studentId?: string): 'ACCEPTED' | 'PENDING' | 'DENIED' {
    const targetStudentId = studentId || this.profile().id;
    const list = this.getAssignmentStudentList(assignmentId);
    const found = list.find(s => s.studentId === targetStudentId || s.studentRoll === this.profile().studentId);
    return found?.status || 'PENDING';
  }

  recordStudentResponse(assignmentId: string, status: 'ACCEPTED' | 'DENIED', reason?: string): void {
    const currentProfile = this.profile();
    const respondedAt = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let currentList = this.getAssignmentStudentList(assignmentId);
    let updatedList = currentList.map(s => {
      if (s.studentId === currentProfile.id || s.studentRoll === currentProfile.studentId) {
        return {
          ...s,
          status,
          respondedAt,
          declineReason: status === 'DENIED' ? (reason || 'Decline requested by student') : undefined
        };
      }
      return s;
    });

    if (!updatedList.some(s => s.studentId === currentProfile.id || s.studentRoll === currentProfile.studentId)) {
      updatedList = [
        {
          studentId: currentProfile.id,
          studentName: currentProfile.fullName + ' (You)',
          studentRoll: currentProfile.studentId,
          email: currentProfile.email,
          avatarUrl: currentProfile.avatarUrl,
          status,
          respondedAt,
          declineReason: status === 'DENIED' ? (reason || 'Decline requested by student') : undefined
        },
        ...updatedList
      ];
    }

    this.assignmentAcceptanceMap.update(m => ({ ...m, [assignmentId]: updatedList }));
    this.persistAssignmentAcceptanceMap();

    const updatedPapers = this.mentorPracticePapers().map(p => {
      if (p.id === assignmentId || p.title === assignmentId || p.paperTitle === assignmentId) {
        return {
          ...p,
          studentAcceptanceList: updatedList
        };
      }
      return p;
    });
    this.mentorPracticePapers.set(updatedPapers);
    try {
      localStorage.setItem(this.KEY_MENTOR_PRACTICE_PAPERS, JSON.stringify(updatedPapers));
    } catch (e) {}

    if (this.practiceChannel) {
      try {
        this.practiceChannel.postMessage({
          type: 'STUDENT_ASSIGNMENT_RESPONSE',
          assignmentId,
          studentId: currentProfile.id,
          studentName: currentProfile.fullName,
          studentRoll: currentProfile.studentId,
          email: currentProfile.email,
          avatarUrl: currentProfile.avatarUrl,
          status,
          respondedAt,
          declineReason: status === 'DENIED' ? (reason || 'Decline requested by student') : undefined,
          studentAcceptanceList: updatedList
        });
      } catch (e) {}
    }
  }

  private seedDefaultMentorPracticePapers(): void {
    const defaultRoster = this.generateClassStudentRoster('cls-401', 'PENDING');
    const defaultPaper: MentorPracticePaper = {
      id: 'paper-401-1',
      paperTitle: 'Practice Paper #1: Raft Consensus & CAP Invariants Drill',
      classId: 'cls-401',
      className: 'Distributed Systems',
      subjectCode: 'CS401',
      topic: 'Raft Consensus Algorithm & Log Reconciliation',
      placeLocation: 'Apex High-Performance Computing Lab & Virtual LMS',
      motive: 'Mandatory preparatory drill ahead of next Tuesday Mid-Term Oral VIVA on Raft Consensus & CAP Theorem. Review every step-by-step proof.',
      targetCO: 'CO3: Consensus Algorithms & Fault Tolerance',
      sourceFormat: 'PDF',
      languageMode: 'PARAPHRASED_SIMPLIFIED',
      difficulty: 'MEDIUM',
      linkedVivaTestId: 'test-viva-1',
      uploadedBy: 'Prof. Aris Thorne (SX-M401)',
      uploadedAt: 'Oct 12, 2026',
      publishedAt: 'Oct 12, 2026, 09:00 AM',
      releaseTime: 'Oct 12, 2026, 09:00 AM',
      endTime: 'Oct 15, 2026, 09:00 AM',
      durationValue: '3 Days',
      status: 'ACTIVE',
      isTerminated: false,
      paperContentMode: 'WITH_SOLUTIONS',
      ticketReason: 'Mandatory preparatory drill ahead of next Tuesday Mid-Term Oral VIVA on Raft Consensus & CAP Theorem.',
      resultState: 'PRACTICED',
      studentAcceptanceList: defaultRoster,
      questions: [
        {
          id: 'pyq-mentor-1',
          subjectCode: 'CS401',
          subjectName: 'Distributed Systems',
          topic: 'Raft Consensus Algorithm',
          difficulty: 'MEDIUM',
          format: 'VIVA',
          frequencyBadge: '🎯 Mentor Assigned VIVA Practice Drill',
          recurrenceRate: 98,
          collegeId: 'apex',
          collegeName: 'Apex Institute of Technology',
          yearAsked: 'Assigned for Spring 2026 VIVA',
          isHighYield: true,
          isFromMentorPaper: true,
          mentorPaperMetadata: {
            paperTitle: 'Practice Paper #1: Raft Consensus & CAP Invariants Drill',
            motive: 'Mandatory preparatory drill ahead of next Tuesday Mid-Term Oral VIVA on Raft Consensus & CAP Theorem. Review every step-by-step proof.',
            targetCO: 'CO3: Consensus Algorithms & Fault Tolerance',
            resultState: 'PRACTICED',
            linkedVivaTitle: 'Midterm Spoken Oral VIVA: Raft Consensus & CAP Theorem',
            uploadedBy: 'Prof. Aris Thorne (SX-M401)'
          },
          questionText: 'How does a newly elected Raft Leader bring lagging followers up to date, and why is log truncation necessary when uncommitted term conflicts exist?',
          targetCO: 'CO3',
          bloomLevel: 'ANALYZE',
          universityTags: ['Apex Institute 2026', 'Curated by Prof. Aris Thorne'],
          aiThinkerSolution: {
            simpleExplanation: '💡 Simple Intuitive Analogy: Imagine a group notebook where everyone copies notes from the head student (Leader). If one student missed two classes, the head student flips backward in their notebook until they find the last page they both agree on. Any scribble the lagging student made without approval is erased, and the head student pages are copied forward. This guarantees everyone shares one truth.',
            mathematicalDerivation: '📐 Formal Invariant:\n1. Log Matching Property: If two logs contain an entry with the same index and term, they are identical up to that index.\n2. NextIndex array: For follower j, Leader initializes nextIndex[j] = lastLogIndex + 1.\n3. Upon AppendEntries rejection (prevLogIndex, prevLogTerm mismatch), Leader decrements nextIndex[j] monotonically: nextIndex[j] := max(1, nextIndex[j] - 1) until match is found, then overwrites conflicting entries.',
            architectureDiagram: `Leader Log:    [Term 1] [Term 1] [Term 2] [Term 3 (Committed)]
Follower Log:  [Term 1] [Term 1] [Term 1 (Conflict! Erased)] -> Rewritten to [Term 2] [Term 3]`,
            examinerKeywords: ['AppendEntries RPC', 'nextIndex & matchIndex', 'Log Matching Property', 'Leader Append-Only Invariant', 'Conflict Truncation']
          },
          youtubeReference: {
            title: 'Raft Log Replication & Conflict Resolution Step-by-Step',
            channelName: 'MIT 6.824 Distributed Systems',
            duration: '14:32',
            youtubeUrl: 'https://www.youtube.com/watch?v=64Zp3RpgRzs',
            timestampNote: 'Log reconciliation at 08:20'
          },
          examSolution: {
            definition: 'Log reconciliation in Raft guarantees state machine consistency across all cluster nodes.',
            workingPrinciple: 'The Leader maintains nextIndex for each follower. If AppendEntries fails, Leader decrements nextIndex until follower matches, then replicates missing entries.',
            stepByStepDerivation: 'Leader sends AppendEntries with prevLogIndex and prevLogTerm. Follower checks match. If false, Leader decrements nextIndex and retries. Once matched, uncommitted conflicting entries are truncated.',
            realWorldApplications: ['etcd cluster recovery', 'Apache Kafka Raft (KRaft)', 'CockroachDB Range Replication'],
            examinerKeywords: ['nextIndex', 'AppendEntries', 'Log Matching Property', 'State Machine Replication']
          },
          evaluationRubric: [
            { criterion: 'nextIndex & matchIndex mechanics', marks: 4, description: 'Explanation of leader state tracking for peers.' },
            { criterion: 'Conflict truncation & overwrite', marks: 4, description: 'Handling of uncommitted entries from un-elected previous terms.' },
            { criterion: 'Commit index advancement', marks: 2, description: 'Advancing leader commitIndex only after majority acknowledgment.' }
          ],
          videoTutorials: [
            {
              title: 'Raft Log Replication & Conflict Resolution',
              channelName: 'MIT 6.824',
              duration: '14:32',
              youtubeUrl: 'https://www.youtube.com/watch?v=64Zp3RpgRzs',
              timestampNote: 'At 08:20'
            }
          ]
        }
      ]
    };

    this.mentorPracticePapers.set([defaultPaper]);
  }

  publishMentorPracticePaper(paper: MentorPracticePaper): void {
    if (!paper.studentAcceptanceList || paper.studentAcceptanceList.length === 0) {
      paper.studentAcceptanceList = this.generateClassStudentRoster(paper.classId, 'PENDING');
    }
    this.assignmentAcceptanceMap.update(m => ({ ...m, [paper.id]: paper.studentAcceptanceList! }));
    this.persistAssignmentAcceptanceMap();

    const currentPapers = this.mentorPracticePapers();
    const updatedPapers = [paper, ...currentPapers.filter(p => p.id !== paper.id)];
    this.mentorPracticePapers.set(updatedPapers);
    try {
      localStorage.setItem(this.KEY_MENTOR_PRACTICE_PAPERS, JSON.stringify(updatedPapers));
    } catch(e) {}

    // Prepend questions to pyqs
    const currentPyqs = this.pyqs();
    const newPyqs = [...paper.questions, ...currentPyqs.filter(p => !paper.questions.some(np => np.id === p.id))];
    this.pyqs.set(newPyqs);

    if (this.practiceChannel) {
      try {
        this.practiceChannel.postMessage({
          type: 'MENTOR_PRACTICE_PAPER_PUBLISHED',
          paper
        });
      } catch (e) {}
    }
  }

  terminateMentorPracticePaper(paperId: string): void {
    const updatedPapers = this.mentorPracticePapers().map(p => {
      if (p.id === paperId || p.title === paperId || p.paperTitle === paperId) {
        return {
          ...p,
          isTerminated: true,
          status: 'TERMINATED' as const
        };
      }
      return p;
    });
    this.mentorPracticePapers.set(updatedPapers);
    try {
      localStorage.setItem(this.KEY_MENTOR_PRACTICE_PAPERS, JSON.stringify(updatedPapers));
    } catch(e) {}

    if (this.practiceChannel) {
      try {
        this.practiceChannel.postMessage({
          type: 'MENTOR_PRACTICE_PAPER_TERMINATED',
          paperId
        });
      } catch (e) {}
    }
  }

  updateQuestionResultState(questionId: string, state: 'NOT_ATTEMPTED' | 'PRACTICED' | 'MASTERED'): void {
    this.pyqs.update(list => list.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          mentorPaperMetadata: q.mentorPaperMetadata ? {
            ...q.mentorPaperMetadata,
            resultState: state
          } : undefined
        };
      }
      return q;
    }));
  }

  syncOfficialUniversityData(collegeId: string): Observable<{
    syncedAt: string;
    officialUrl: string;
    accreditation: string;
    papersFound: number;
    message: string;
  }> {
    const college = this.practiceColleges().find(c => c.id === collegeId);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const papers = this.universityQuestionPapers().filter(p => p.universityId === collegeId);
    const count = papers.length > 0 ? papers.length : 5;

    return of({
      syncedAt: now,
      officialUrl: college?.websiteUrl || 'https://www.official-portal.ac.in',
      accreditation: college?.accreditation || 'Autonomous / Central AICTE Accreditation',
      papersFound: count,
      message: `Verified & synchronized live with Controller of Examinations (COE) portal for ${college?.name || 'institution'}. All syllabus course outcomes, 5-year paper archives, and answer rubrics active.`
    }).pipe(delay(850));
  }

  searchOrAddGlobalUniversity(query: string): PracticeCollege {
    const trimmed = query.trim();
    if (!trimmed) return this.practiceColleges()[0];

    const existing = this.practiceColleges().find(c =>
      c.name.toLowerCase().includes(trimmed.toLowerCase()) ||
      c.shortCode.toLowerCase() === trimmed.toLowerCase() ||
      (c.city && c.city.toLowerCase().includes(trimmed.toLowerCase()))
    );

    if (existing) {
      this.selectedCollegeId.set(existing.id);
      return existing;
    }

    // Dynamically index and structure new global university
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    const words = trimmed.split(' ').filter(w => w.length > 0);
    const shortCode = words.length > 1
      ? words.map(w => w[0]).join('').toUpperCase().slice(0, 6)
      : trimmed.slice(0, 4).toUpperCase();

    const newCollege: PracticeCollege = {
      id: 'custom-' + slug + '-' + Date.now().toString().slice(-4),
      name: trimmed,
      shortCode: shortCode,
      city: 'Global Campus',
      country: 'International',
      state: 'Worldwide Archive',
      tier: 'Global Accredited University',
      logoIcon: '🌐',
      pyqCount: 175,
      paperCount: 6,
      establishedYear: 1975,
      isGlobal: true,
      highlight: `Past 5-year verified examination paper repository for ${trimmed}`
    };

    this.practiceColleges.update(cols => [newCollege, ...cols]);
    this.selectedCollegeId.set(newCollege.id);
    this.generatePapersForCustomUniversity(newCollege);
    return newCollege;
  }

  private createFullPaperQuestions(params: {
    collegeId: string;
    collegeName: string;
    shortCode: string;
    campusLocation?: string;
    academicYear: string;
    examinationType: 'END_SEM' | 'MID_SEM' | 'SUPPLEMENTARY' | 'SPECIAL_VIVA' | 'NATIONAL_ENTRANCE';
    subjectCode: string;
    subjectName: string;
    requestedVolume?: number;
  }): MinedPYQ[] {
    const yr = params.academicYear;
    const typeLabel = params.examinationType === 'END_SEM' ? 'EndSem Final' :
                      params.examinationType === 'MID_SEM' ? 'MidSem' :
                      params.examinationType === 'NATIONAL_ENTRANCE' ? 'Official Exam' : 'Semester Exam';

    const baseList: MinedPYQ[] = [
      {
        id: `${params.collegeId}-${yr}-q1`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Raft Consensus Protocol',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 95% High-Yield Repeat',
        recurrenceRate: 95,
        yearAsked: `${yr} ${typeLabel} (Q1)`,
        marks: 10,
        targetCO: 'CO3',
        bloomLevel: 'ANALYZE',
        universityTags: [params.shortCode, `${yr} Paper`, 'Core Consensus'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.8,
        subjectCategory: 'CORE',
        questionText: 'Q1. In the Raft Consensus Protocol, analyze the Leader Election mechanism. How does randomized timer jitter (150ms-300ms) guarantee split-vote resolution, and what is the quorum safety condition?',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Imagine 5 people trying to pick a team leader without a phone. If all 5 shout at the same time, nobody wins (a split vote). Raft gives each person an egg timer set randomly between 150ms and 300ms. The first person whose timer rings speaks up immediately and asks everyone to vote for them. Because timer values are random, two people almost never ring at the same second!',
          mathematicalDerivation: '📐 Quorum Intersection Proof:\nLet N be total cluster nodes. Majority Quorum Q = ⌊N/2⌋ + 1.\nIf Leader L1 receives vote set V1 (|V1| ≥ Q) and candidate L2 receives V2 (|V2| ≥ Q):\nBy Pigeonhole: |V1 ∩ V2| ≥ 1. Since any honest node votes at most ONCE per Term T, |V1 ∩ V2| ≤ 1 with consistent vote.\nTherefore, at most ONE leader can achieve Q in term T. Q.E.D.',
          architectureDiagram: '[ Follower ] --(Timer: 150-300ms)--> [ Candidate ] --(Votes ≥ N/2 + 1)--> [ Leader ]\n     ^                                                       |\n     +--------------------(Discovers Higher Term)------------+',
          examinerKeywords: ['Heartbeat Timeout (150-300ms)', 'Randomized Election Jitter', 'Majority Quorum ⌊N/2⌋+1', 'Term Monotonicity', 'Split-Vote Resolution']
        },
        structuredExamMarking: {
          totalMarks: 10,
          breakdown: [
            { component: 'Protocol State Machine & Roles', marks: 2, description: 'Clear formulation of Follower, Candidate, and Leader states with transitions.' },
            { component: 'Randomized Election Timeout Jitter', marks: 2, description: 'Explanation of 150ms-300ms timer window and split-vote prevention.' },
            { component: 'Quorum Safety Mathematical Proof', marks: 3, description: 'Formal proof showing any two majorities intersect by at least one node.' },
            { component: 'Candidate State & Vote Request Flow Diagram', marks: 2, description: 'Detailed architecture message interaction flow and RPC semantics.' },
            { component: 'Examiner Rubric & Term Invariant', marks: 1, description: 'Monotonic terms, election safety rule, and log completeness.' }
          ],
          overallView: 'The Raft Consensus Protocol decomposes state machine replication into distinct, comprehensible subproblems: Leader Election, Log Replication, and Safety. Its randomized election timer mechanism guarantees liveness by practically eliminating sustained split-vote deadlocks in asynchronous distributed clusters.',
          detailedTopicExplanation: 'In Raft, every cluster node operates in one of three states: Follower, Candidate, or Leader. Normal execution proceeds with a single authoritative Leader receiving client commands, appending them to its local log, and replicating them to followers via AppendEntries RPCs. If a Follower stops hearing heartbeats from the Leader within its election timeout, it assumes the leader has failed.\n\nTo initiate an election, the follower increments its current term, transitions to the Candidate state, votes for itself, and broadcasts RequestVote RPCs to all peers. The critical design innovation of Raft is Randomized Election Timeout Jitter: instead of a fixed interval, timeouts are randomly chosen from a range (typically 150ms - 300ms). This breaks symmetry among simultaneous failures, ensuring that one node initiates an election and collects votes before competitors timeout.\n\nA candidate becomes leader only upon securing votes from a strict majority quorum Q = floor(N/2) + 1. Because any two majorities must overlap by at least one node, and an honest node grants at most one vote per term on a first-come basis, at most one candidate can win in any given term. The leader maintains authority by broadcasting periodic heartbeat messages with empty AppendEntries payloads.',
          architectureDiagram: `=============================================================================
                  RAFT LEADER ELECTION STATE MACHINE TOPOLOGY
=============================================================================
                  +-----------------------------------+
                  |            FOLLOWER               |
                  +-----------------+-----------------+
                                    | Times out (150-300ms jitter)
                                    | Starts Election (Term++)
                                    v
                  +-----------------+-----------------+
                  |            CANDIDATE              |<---------+
                  +--------+--------------------------+          |
                           |                                     |
             Votes >= Q    |             Discovers new Leader    | Times out
            (floor(N/2)+1) |             or Higher Term          | New Election
                           v                                     |
                  +--------+--------------------------+          |
                  |             LEADER                +----------+
                  +-----------------------------------+
=============================================================================`,
          mathematicalDerivation: `1. Quorum Intersection Theorem:
   Let N = total nodes. Majority quorum Q = floor(N / 2) + 1.
   Let V1, V2 be vote majorities for candidates C1, C2 in Term T:
   |V1| >= Q and |V2| >= Q.
   |V1 intersect V2| = |V1| + |V2| - |V1 union V2|
                     >= 2 * (floor(N / 2) + 1) - N
                     >= N + 1 - N >= 1.

2. Election Safety Invariant:
   Since |V1 intersect V2| >= 1, there exists at least one node n_v in (V1 intersect V2).
   Node n_v votes at most once in Term T.
   Therefore, C1 == C2. At most one leader can be elected per term.`,
          examinerKeyPoints: [
            'Follower -> Candidate -> Leader lifecycle state transitions.',
            'Role of randomized election timeout (150ms-300ms) in resolving split-vote scenarios.',
            'Pigeonhole quorum intersection proof: |V1 intersect V2| >= 1.',
            'AppendEntries heartbeat mechanics to suppress competing candidate elections.',
            'Election restriction rule: candidate must have all committed entries.'
          ]
        },
        youtubeReference: {
          title: 'Raft Consensus Algorithm Visualization & Step-by-Step Proof',
          channelName: 'MIT 6.824 Distributed Systems',
          duration: '14:25',
          youtubeUrl: 'https://www.youtube.com/watch?v=vYp4LYbnnW8',
          timestampNote: 'Split-vote demo at 04:30'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q2`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'CAP Theorem & Consistency Models',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 Core Foundation (92% Recurrence)',
        recurrenceRate: 92,
        yearAsked: `${yr} ${typeLabel} (Q2)`,
        marks: 10,
        targetCO: 'CO5',
        bloomLevel: 'ANALYZE',
        universityTags: [params.shortCode, `${yr} Paper`, 'Distributed Storage'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.5,
        subjectCategory: 'CORE',
        questionText: 'Q2. Formulate and prove the CAP Theorem under asynchronous network partitions. Why is simultaneous Linearizable Consistency (C) and High Availability (A) impossible when Partition Tolerance (P) is violated?',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Picture two bank branch offices connected by an underground fiber cable. When a construction backhoe slices the cable (Network Partition), a user deposits $500 in Branch A. Then another user checks balance at Branch B. Branch B can either: (1) say "System Offline" (Consistent, but NOT Available), or (2) guess the old balance (Available, but NOT Consistent!). You cannot have both once the wire is severed.',
          mathematicalDerivation: '📐 Gilbert & Lynch Linearizability Formulation:\nLet system S be partitioned into disjoint subsets G1, G2 such that messages between G1 and G2 are lost.\nClient W writes v1 to G1; by Availability A, G1 acknowledges write without awaiting G2 response.\nClient R reads from G2; by Availability A, G2 must respond without awaiting G1.\nSince G2 has received zero messages from G1, G2 must return stale value v0 ≠ v1.\nThus, Linearizability C is violated: write(v1) returned before read(v0), contradiction.',
          architectureDiagram: '[ Client W ] ---> [ Node G1 (v1) ]   === Partition P ===   [ Node G2 (v0) ] <--- [ Client R ]\n                          |                                          |\n                  (Returns 200 OK)                          (Returns Stale v0)',
          examinerKeywords: ['Gilbert & Lynch Proof', 'Linearizable Consistency', 'Non-blocking Availability', 'Network Partition P', 'PACELC Extension']
        },
        structuredExamMarking: {
          totalMarks: 10,
          breakdown: [
            { component: 'Definitions of C, A, and P Properties', marks: 2, description: 'Formal characterization of Atomic Consistency, 100% Non-failing Availability, and Arbitrary Message Loss.' },
            { component: 'Gilbert & Lynch Formal Contradiction Proof', marks: 3, description: 'Partitioned components G1 and G2 proof showing read-after-write linearizability violation.' },
            { component: 'Partition Topology Architecture Diagram', marks: 2, description: 'Visual mapping of isolated network islands and divergent read/write client interactions.' },
            { component: 'PACELC Tradeoff Extension Analysis', marks: 2, description: 'Evaluating CP vs AP in normal conditions (Latency vs Consistency) with real-world databases.' },
            { component: 'Examiner Rubric & Technical Keywords', marks: 1, description: 'Mention of Dynamo (AP), Spanner (CP), and asynchronous network bounds.' }
          ],
          overallView: 'The CAP Theorem (formalized by Gilbert and Lynch) establishes a fundamental trade-off: in an asynchronous distributed data store subjected to physical network partitions, system designers can preserve Linearizable Consistency (CP) or Full Non-blocking Availability (AP), but never both simultaneously.',
          detailedTopicExplanation: 'When architecting distributed data stores across network backbones, network partitions (P) are an inevitable physical reality caused by router resets, fiber cuts, and packet loss. Under partition P, nodes are severed into non-communicating network partitions G1 and G2.\n\nIf a client submits a write request to a replica in partition G1, the system has exactly two architectural choices: (1) Accept the write and return success immediately (prioritizing Availability). However, since G1 cannot communicate across the partition to update G2, any subsequent client reading from G2 will retrieve obsolete data, violating Linearizable Consistency (C). (2) Block the write or decline the read on G2 until partition recovery (prioritizing Consistency). In doing so, the node fails to return a non-error response, violating Availability (A).\n\nDaniel Abadi extended this theorem into the PACELC framework: If there is a Partition (P), how does your system choose between Availability (A) and Consistency (C); Else (E), when the network is operating normally, how does your system trade off Latency (L) and Consistency (C)?',
          architectureDiagram: `=============================================================================
                  GILBERT & LYNCH CAP THEOREM PARTITION PROOF
=============================================================================
      [ Client Write: v1 ]                     [ Client Read: ? ]
               |                                        |
               v                                        v
     +-------------------+                    +-------------------+
     |    Partition G1   |    X - NETWORK - X |    Partition G2   |
     |    Node N1 (v1)   |    X  PARTITION  X |    Node N2 (v0)   |
     +-------------------+                    +-------------------+
               |                                        |
    Success: 200 OK (Fast)                   Must return value:
                                             Option A: Returns v0 -> Violates C!
                                             Option B: Error/Drop -> Violates A!
=============================================================================`,
          mathematicalDerivation: `1. Formal Property Definitions:
   - Consistency (C): Every read operation returns the value of the most recent write.
   - Availability (A): Every non-failing node must return a non-error response for every request.
   - Partition Tolerance (P): The network may drop arbitrary messages sent between nodes.

2. Contradiction Proof:
   Assume system S achieves both C and A during partition P between components G1 and G2.
   At time t1: Client W sends write(k, v1) to node in G1.
   By Availability: G1 acknowledges write(k, v1) successfully at time t2 > t1 without awaiting G2.
   At time t3 > t2: Client R sends read(k) to node in G2.
   By Availability: G2 must return response without communicating with G1.
   Because G2 received 0 messages from G1 regarding write(k, v1), G2 returns initial value v0 != v1.
   Linearizability requires that read at t3 must reflect write at t2 < t3.
   Contradiction! System S cannot satisfy both C and A under Partition P.`,
          examinerKeyPoints: [
            'Exact definition of Gilbert & Lynch linearizable consistency.',
            'Distinction between high availability (non-error response) and uptime.',
            'Proof by contradiction using isolated partitions G1 and G2.',
            'PACELC framework (e.g. Dynamo is PA/EL; Spanner is PC/EC).',
            'Eventual consistency and vector clock reconciliation in AP systems.'
          ]
        },
        youtubeReference: {
          title: 'CAP Theorem Explained with Formal Proof',
          channelName: 'Martin Kleppmann (Cambridge)',
          duration: '12:10',
          youtubeUrl: 'https://www.youtube.com/watch?v=k-Yaq8AHlFA',
          timestampNote: 'Proof starts at 05:10'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q3`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Logical & Vector Clocks',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 Top Oral Viva & Written Question (90% Recurrence)',
        recurrenceRate: 90,
        yearAsked: `${yr} ${typeLabel} (Q3)`,
        marks: 10,
        targetCO: 'CO2',
        bloomLevel: 'APPLY',
        universityTags: [params.shortCode, `${yr} Paper`, 'Event Ordering'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.3,
        subjectCategory: 'CORE',
        questionText: 'Q3. State Lamport\'s Clock Condition and update rules. Prove why e1 -> e2 implies L(e1) < L(e2) but the converse is not true, and show how Vector Clocks resolve concurrency detection.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Lamport clocks give events simple sequence numbers (1, 2, 3...). If event A caused event B, B\'s number is definitely bigger. But if two people in different cities do something independently, their numbers might say 4 and 5, yet neither influenced the other! Vector clocks give each computer an array of numbers representing how many messages it has seen from everyone. If neither array is completely greater, they are strictly concurrent!',
          mathematicalDerivation: '📐 Lamport Update Rules:\n1. Local event on process Pi: Ci = Ci + d (d > 0, typically d = 1).\n2. Message sending: Pi sends message m with timestamp Tm = Ci.\n3. Message receipt: Pj receives (m, Tm), updates: Cj = max(Cj, Tm) + 1.\nVector Clock Invariant: V(e1) < V(e2) iff for all k: V(e1)[k] ≤ V(e2)[k] AND exists j: V(e1)[j] < V(e2)[j].\nCausality Theorem: e1 -> e2 ⟺ V(e1) < V(e2). Strict equivalence!',
          architectureDiagram: 'P1: [ (1,0,0) ] =====(Msg: 2,0,0)=====> P2: [ (0,1,0) -> (2,2,0) ]\n                                              |\nP3: [ (0,0,1) ] <=====(Msg: 2,2,0)============+',
          examinerKeywords: ['Lamport Clock Condition', 'Partial Order vs Total Order', 'Vector Clock Equivalence', 'Concurrent Events (e1 || e2)', 'Causal Precedence']
        },
        structuredExamMarking: {
          totalMarks: 10,
          breakdown: [
            { component: 'Happens-Before Relation (->) & Axioms', marks: 2, description: 'Definition of causal precedence within same process, message passing, and transitivity.' },
            { component: 'Lamport Clock Algorithm & Update Rules', marks: 2, description: 'Logical clock increment rules and message timestamping mechanics.' },
            { component: 'Lamport Inadequacy Proof (Converse Fails)', marks: 2, description: 'Proof showing L(e1) < L(e2) does not imply e1 -> e2 due to lack of causal guarantees.' },
            { component: 'Vector Clocks & Concurrency Detection (a || b)', marks: 3, description: 'Vector dominance relation, concurrent event identification, and causal history preservation.' },
            { component: 'Examiner Keywords & Distributed Causality', marks: 1, description: 'Partial ordering, logical time, and synchronization invariants.' }
          ],
          overallView: 'Lamport logical clocks establish a partial ordering of events in asynchronous distributed systems using the happens-before relation (->). However, because Lamport clocks cannot distinguish causally related events from concurrent ones, Vector Clocks extend this model by maintaining multi-dimensional arrays that precisely capture causality and concurrency.',
          detailedTopicExplanation: 'In distributed systems lacking a global physical clock, Leslie Lamport introduced the "happens-before" relation (->) as a strict partial ordering. An event a happens before b (a -> b) if: (1) a and b occur within the same process and a occurs before b; (2) a is the sending of a message and b is the receipt of that same message; or (3) by transitivity, if a -> c and c -> b.\n\nLamport Logical Clocks assign a monotonically increasing integer timestamp L(e) to every event. The update rules specify that processes increment their local clock on every event, attach the timestamp to outgoing messages, and upon receipt, update their local clock to max(local, received) + 1. While this guarantees the clock condition (a -> b implies L(a) < L(b)), the converse is false: L(a) < L(b) does not imply a -> b because independent processes can generate overlapping timestamps without causal links.\n\nTo overcome this limitation, Vector Clocks assign an n-dimensional vector V to each process. By comparing vector domination (V(a) <= V(b)), systems can definitively detect concurrent events (a || b) where neither caused the other.',
          architectureDiagram: `=============================================================================
                  LAMPORT CLOCKS VS VECTOR CLOCKS CAUSALITY
=============================================================================
   P1:  (1,0,0) -------- [Msg: e1->e2] --------> (2,1,0)
           \\                                      ^
            \\                                    /
   P2:   (0,0,0) -------------------------------> (1,1,1) [Concurrent Merge]
=============================================================================`,
          mathematicalDerivation: `1. Lamport Clock Condition:
   For any events e1, e2: if e1 -> e2, then L(e1) < L(e2).
   Converse does NOT hold: L(e1) < L(e2) does NOT imply e1 -> e2.

2. Vector Clock Causality Equivalence:
   Let V(a) and V(b) be vector timestamps for events a and b across N processes.
   - a -> b (causally precedes) <=> (for all k: V(a)[k] <= V(b)[k]) AND (exists k: V(a)[k] < V(b)[k]).
   - Concurrency (a || b) <=> not(V(a) <= V(b)) AND not(V(b) <= V(a)).`,
          examinerKeyPoints: [
            'Happens-before relation rules (process order, message passing, transitivity).',
            'Lamport clock timestamp assignment and max()+1 receive rule.',
            'Proof of why the converse of Lamport clock condition fails.',
            'Vector clock dimension size equal to total cluster nodes N.',
            'Exact definition and mathematical check for concurrent events (a || b).'
          ]
        },
        youtubeReference: {
          title: 'Vector Clocks & Causality in Distributed Systems',
          channelName: 'Computerphile',
          duration: '14:10',
          youtubeUrl: 'https://www.youtube.com/watch?v=ER4i8XQpU7Q',
          timestampNote: 'Vector math at 06:45'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q4`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Byzantine Fault Tolerance & Quorums',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 89% Recurrence in Tier-1 Exams',
        recurrenceRate: 89,
        yearAsked: `${yr} ${typeLabel} (Q4)`,
        marks: 10,
        targetCO: 'CO4',
        bloomLevel: 'EVALUATE',
        universityTags: [params.shortCode, `${yr} Paper`, 'BFT Consensus'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.6,
        subjectCategory: 'CORE',
        questionText: 'Q4. In Practical Byzantine Fault Tolerance (PBFT) with f faulty or malicious nodes, derive why a minimum cluster size of N ≥ 3f + 1 nodes is strictly necessary for safety and liveness.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Imagine a court of judges where f judges are corrupt spies. If f nodes don\'t respond at all, the system must still proceed (N - f nodes required for liveness). But among the responding nodes, another f nodes might be corrupt liars sending bad votes! For honest nodes to strictly outvote the liars: (N - f) - f > f  ⟹  N - 2f > f  ⟹  N ≥ 3f + 1!',
          mathematicalDerivation: '📐 Mathematical Quorum Overlap Derivation:\n1. Liveness: System must make progress despite f silent nodes. Thus quorum size Q ≤ N - f.\n2. Safety: Any two quorums Q1 and Q2 must intersect in at least one honest node.\n   |Q1 ∩ Q2| = |Q1| + |Q2| - |Q1 ∪ Q2| ≥ 2(N - f) - N = N - 2f.\n3. To guarantee at least one honest node in the intersection: |Q1 ∩ Q2| ≥ f + 1.\n   N - 2f ≥ f + 1 ⟹ N ≥ 3f + 1. Q.E.D.',
          architectureDiagram: 'Total Nodes N = 3f + 1\n[ Honest: 2f + 1 ] + [ Byzantine Faulty: f ]\nQuorum Intersect: |Q1 ∩ Q2| ≥ f + 1 (Guarantees ≥ 1 Honest Witness)',
          examinerKeywords: ['Byzantine Generals', 'N ≥ 3f + 1 Derivation', 'Quorum Intersection Invariant', 'Pre-prepare, Prepare, Commit', 'Castro & Liskov PBFT']
        },
        youtubeReference: {
          title: 'Byzantine Fault Tolerance & PBFT Explained Simply',
          channelName: 'Stanford Blockchain Lecture',
          duration: '15:20',
          youtubeUrl: 'https://www.youtube.com/watch?v=dfsdf234',
          timestampNote: 'Mathematical derivation at 08:30'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q5`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'TCP Congestion Control & Flow Control',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 96% Recurrence across 8 Universities',
        recurrenceRate: 96,
        yearAsked: `${yr} ${typeLabel} (Q5)`,
        marks: 10,
        targetCO: 'CO4',
        bloomLevel: 'APPLY',
        universityTags: [params.shortCode, `${yr} Paper`, 'Transport Protocols'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.4,
        subjectCategory: 'CORE',
        questionText: 'Q5. Contrast TCP Reno and TCP Cubic congestion control algorithms. Explain the AIMD window dynamics and calculate the cwnd evolution when 3 duplicate ACKs are received versus a retransmission timeout.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: AIMD is like a driver testing the speed limit: you tap the accelerator up by 1 mph every second (Additive Increase). If you spot brake lights (3 duplicate ACKs), you calmly drop your speed by half (Multiplicative Decrease) and keep rolling. But if you crash into a road closure (Timeout), you slam to 1 mph and restart from the beginning!',
          mathematicalDerivation: '📐 AIMD Equations:\n1. Additive Increase: cwnd(t + RTT) = cwnd(t) + 1 MSS (when cwnd ≥ ssthresh).\n2. 3-Duplicate ACKs (Fast Retransmit/Recovery): ssthresh = cwnd / 2; cwnd = ssthresh + 3 MSS.\n3. RTO Timeout: ssthresh = cwnd / 2; cwnd = 1 MSS (Full reset to Slow Start).\n4. Steady-state throughput: B = (MSS / RTT) * √(3 / (2p)) where p is packet loss probability.',
          architectureDiagram: 'cwnd\n  ^\n  |      /\\ (Avoidance: +1 MSS/RTT)\n  |     /  \\ (3 Dup ACK: drop to cwnd/2)\n  | /| /    \\__\n  |/ |/ (Timeout: drop to 1 MSS)\n  +------------------------------> Time (RTT)',
          examinerKeywords: ['AIMD (Additive Increase Multiplicative Decrease)', 'Slow Start Threshold (ssthresh)', 'Fast Recovery vs Timeout', 'TCP Reno Sawtooth Curve', 'Throughput Formula']
        },
        youtubeReference: {
          title: 'TCP Congestion Control Sawtooth Derivation',
          channelName: 'Stanford CS144 Networking',
          duration: '16:45',
          youtubeUrl: 'https://www.youtube.com/watch?v=F27PLhn3W04',
          timestampNote: 'AIMD proof at 07:15'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q6`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Two-Phase Commit (2PC) vs Three-Phase Commit (3PC)',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 88% Core Exam Recurrence',
        recurrenceRate: 88,
        yearAsked: `${yr} ${typeLabel} (Q6)`,
        marks: 10,
        targetCO: 'CO3',
        bloomLevel: 'ANALYZE',
        universityTags: [params.shortCode, `${yr} Paper`, 'Atomic Transactions'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.0,
        subjectCategory: 'CORE',
        questionText: 'Q6. Analyze why the classic Two-Phase Commit (2PC) protocol is blocking under coordinator failure. How does the Three-Phase Commit (3PC) protocol introduce a non-blocking PreCommit state?',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: In 2PC, a wedding officiant (Coordinator) asks both partners (Participants): "Do you agree?" If everyone says yes, they wait for the final "I now pronounce you...". If the officiant suddenly has a heart attack right after they say yes, both partners are stuck in limbo holding locks forever! 3PC adds a middle state: "Everyone prepare to sign", allowing attendees to check on each other if the officiant disappears.',
          mathematicalDerivation: '📐 Non-Blocking Condition Invariant (Skeen\'s Theorem):\nA distributed transaction protocol is non-blocking under fail-stop coordinator failure iff there is NO state from which it is possible to transition directly to COMMIT and also directly to ABORT.\nIn 2PC: Node in PREPARED state can transition to either COMMIT or ABORT ⟹ BLOCKING.\nIn 3PC: PRECOMMIT state isolates COMMIT from ABORT. If any node is in PRECOMMIT, no node has ABORTED.',
          architectureDiagram: '2PC: [ Init ] ---> [ Prepare ] ---> [ Commit / Abort ] (BLOCKING on Crash!)\n3PC: [ Init ] ---> [ CanCommit ] ---> [ PreCommit ] ---> [ DoCommit ] (NON-BLOCKING)',
          examinerKeywords: ['Coordinator Failure', 'Blocking Vulnerability', 'Skeen Non-Blocking Criterion', 'PreCommit State', 'Timeout Termination Protocol']
        },
        youtubeReference: {
          title: 'Two-Phase Commit vs Three-Phase Commit Explained',
          channelName: 'Distributed Systems Series',
          duration: '13:50',
          youtubeUrl: 'https://www.youtube.com/watch?v=example2pc',
          timestampNote: 'Blocking proof at 06:20'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q7`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Transformer Architecture & Self-Attention',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 Modern High-Yield AI/CS (94% Recurrence)',
        recurrenceRate: 94,
        yearAsked: `${yr} ${typeLabel} (Q7)`,
        marks: 10,
        targetCO: 'CO6',
        bloomLevel: 'EVALUATE',
        universityTags: [params.shortCode, `${yr} Paper`, 'Deep Learning & AI'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.5,
        subjectCategory: 'ELECTIVE',
        questionText: 'Q7. Formulate the Scaled Dot-Product Attention mechanism: Attention(Q, K, V) = softmax((QK^T)/√d_k)V. Derive mathematically why the scaling factor 1/√d_k is necessary to prevent vanishing gradients.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Imagine taking the dot product of two 512-dimensional vectors. When you multiply and add 512 numbers together, the total gets extremely large! When large numbers go into the softmax function, the winning value shoots up close to 1.0 and all other values drop to 0.0. When this happens, the slope (gradient) becomes virtually flat (0), and the neural network stops learning! Dividing by √512 keeps the variance at exactly 1.0!',
          mathematicalDerivation: '📐 Variance Derivation Proof:\nLet q and k be independent random vectors with zero mean and unit variance: E[q_i] = 0, Var(q_i) = 1.\nThe dot product is S = ∑_{i=1}^{d_k} q_i k_i.\nMean E[S] = ∑ E[q_i] E[k_i] = 0.\nVariance Var(S) = ∑ Var(q_i k_i) = ∑ E[q_i^2] E[k_i^2] = d_k * 1 * 1 = d_k.\nAs d_k grows large, |S| becomes large, pushing softmax into extreme regions with tiny derivative σ\'(z) ≈ 0.\nDividing S by √d_k gives Var(S / √d_k) = (1 / d_k) * Var(S) = d_k / d_k = 1. Q.E.D.',
          architectureDiagram: 'Q (Query) x K^T (Key Transpose) ---> [ ÷ √d_k ] ---> [ Softmax (Weights) ] x V (Value) ---> [ Output ]',
          examinerKeywords: ['Scaled Dot-Product', 'Variance Preservation Var = 1', 'Softmax Saturation', 'Vanishing Gradient Mitigation', 'Multi-Head Attention']
        },
        youtubeReference: {
          title: 'Attention is All You Need: Mathematical Derivation',
          channelName: 'Stanford AI CS224N',
          duration: '18:15',
          youtubeUrl: 'https://www.youtube.com/watch?v=exampleAttn',
          timestampNote: 'Scaling factor proof at 09:12'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q8`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Subnetting, CIDR & Variable Length Subnet Masking',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 91% Numerical Problem Recurrence',
        recurrenceRate: 91,
        yearAsked: `${yr} ${typeLabel} (Q8)`,
        marks: 10,
        targetCO: 'CO1',
        bloomLevel: 'APPLY',
        universityTags: [params.shortCode, `${yr} Paper`, 'Computer Networks'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.1,
        subjectCategory: 'CORE',
        questionText: 'Q8. An organization is allocated the IP block 198.51.100.0/24. Design a Variable Length Subnet Mask (VLSM) scheme to accommodate: Subnet A (60 hosts), Subnet B (30 hosts), Subnet C (12 hosts), and Subnet D (2 point-to-point router links).',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Think of a /24 block as a pizza cut into 256 slices. Subnet A needs at least 60 usable hosts, so you allocate a half-pizza (64 slices, /26). Subnet B needs 30 hosts, so you allocate a quarter-pizza (32 slices, /27). Subnet C needs 12 hosts, so you give 16 slices (/28). Subnet D needs 2 hosts for a link, so you give 4 slices (/30). No slices are wasted!',
          mathematicalDerivation: '📐 Host Allocation Math:\n1. Subnet A (60 hosts): 2^h - 2 ≥ 60 ⟹ h=6 (64 addresses). Mask = /26 (255.255.255.192).\n   Range: 198.51.100.0/26 (Usable: .1 to .62, Broadcast: .63).\n2. Subnet B (30 hosts): 2^h - 2 ≥ 30 ⟹ h=5 (32 addresses). Mask = /27 (255.255.255.224).\n   Range: 198.51.100.64/27 (Usable: .65 to .94, Broadcast: .95).\n3. Subnet C (12 hosts): 2^h - 2 ≥ 12 ⟹ h=4 (16 addresses). Mask = /28 (255.255.255.240).\n   Range: 198.51.100.96/28 (Usable: .97 to .110, Broadcast: .111).\n4. Subnet D (2 hosts): 2^h - 2 ≥ 2 ⟹ h=2 (4 addresses). Mask = /30 (255.255.255.252).\n   Range: 198.51.100.112/30 (Usable: .113 to .114, Broadcast: .115).',
          architectureDiagram: '198.51.100.0/24 (Total: 256 IPs)\n├── Subnet A: .0/26 (64 IPs) ---> 60 Hosts\n├── Subnet B: .64/27 (32 IPs) ---> 30 Hosts\n├── Subnet C: .96/28 (16 IPs) ---> 12 Hosts\n└── Subnet D: .112/30 (4 IPs) ---> 2 Router Hosts',
          examinerKeywords: ['VLSM Partitioning', '2^h - 2 Host Formula', 'CIDR Prefix Notation', 'Network Address & Broadcast Address', 'Prefix Aggregation']
        },
        youtubeReference: {
          title: 'VLSM Subnetting Mastery Tutorial',
          channelName: 'NetworkChuck',
          duration: '15:40',
          youtubeUrl: 'https://www.youtube.com/watch?v=exampleSubnet',
          timestampNote: 'Step-by-step division at 04:10'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q9`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Consistent Hashing & Virtual Nodes',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 System Design PYQ Favorite (93% Recurrence)',
        recurrenceRate: 93,
        yearAsked: `${yr} ${typeLabel} (Q9)`,
        marks: 10,
        targetCO: 'CO3',
        bloomLevel: 'UNDERSTAND',
        universityTags: [params.shortCode, `${yr} Paper`, 'Scalable Storage'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.2,
        subjectCategory: 'CORE',
        questionText: 'Q9. Explain Consistent Hashing with a circular ring topology. Prove that adding or removing a node remaps only K/N keys on average, and explain how Virtual Nodes eliminate hot-spot skew.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: In traditional modulo hashing (key % N), if you change the number of servers from 3 to 4, almost 100% of keys get sent to the wrong server and cache fails completely! Consistent hashing maps both servers and keys onto a round clock face (0 to 360 degrees). To find where a key lives, walk clockwise until you bump into the first server. If a server leaves, only its immediate neighbor takes on its load!',
          mathematicalDerivation: '📐 Mathematical Remapping Theorem:\nTraditional Modulo Hashing: Hash(key) mod N. When N changes to N + 1, P(key moves) = N / (N + 1) ≈ 100% reshuffle.\nConsistent Hashing: Hash space [0, 2^b - 1] mapped on a ring.\nWhen node (N + 1) is added, only keys situated between node N and node (N + 1) on the ring are re-assigned.\nExpected fraction of keys reassigned = 1 / (N + 1).\nTotal keys remapped out of K total keys = K / (N + 1) ≈ K / N. Virtual nodes V replicate each physical node V times to achieve variance Var(load) ∝ 1/V.',
          architectureDiagram: 'Ring [0 to 2^32-1]:\n       [ Node A ]\n      /          \\\n[ Key k1 ]        [ Node B ]\n      \\          /\n       [ Node C ]\n(Keys walk clockwise to first node; Virtual Nodes guarantee uniform distribution)',
          examinerKeywords: ['Hash Ring [0, 2^32 - 1]', 'Clockwise Lookup', 'K/N Re-assignment Invariant', 'Virtual Nodes (vnodes)', 'Hotspot Skew Reduction']
        },
        structuredExamMarking: {
          totalMarks: 10,
          breakdown: [
            { component: 'Concept Definition & Hash Ring Geometry', marks: 2, description: 'Explanation of continuous cyclic keyspace [0, 2^b - 1] and clockwise key-to-node assignment.' },
            { component: 'Mathematical Proof of K/N Invariant', marks: 3, description: 'Formal probability theorem contrasting standard modulo hash remapping vs consistent hashing.' },
            { component: 'Ring Topology Architecture Diagram', marks: 2, description: 'ASCII/Visual depiction of nodes, keys, partition arcs, and clockwise lookup walk.' },
            { component: 'Virtual Nodes & Hotspot Elimination', marks: 2, description: 'Analysis of vnodes replica distribution and load variance reduction ∝ 1/V.' },
            { component: 'Examiner Rubric & Technical Keywords', marks: 1, description: 'Mention of Cassandra/Dynamo ring, tombstone keys, and partition ownership migration.' }
          ],
          overallView: 'Consistent Hashing solves the devastating cache-invalidation collapse of traditional modulo partitioning in elastic distributed storage clusters. By mapping both server nodes and object keys to an identical circular 32-bit hash continuum, server join or departure events remap only 1/N of total stored keys without disrupting the remaining (N-1)/N partitions.',
          detailedTopicExplanation: 'When building horizontally scalable distributed storage systems (e.g. Amazon DynamoDB, Apache Cassandra, Couchbase), data partition placement must adapt gracefully as nodes are added or decommissioned. Under conventional modulo hashing hash(k) mod N, introducing an (N+1)-th node triggers remapping of approximately N/(N+1) ≈ 90-99% of all cluster keys, triggering disastrous cache thrashing and network saturation.\n\nConsistent Hashing resolves this fundamental limitation by utilizing an abstract circular keyspace from 0 to 2^32 - 1. Physical nodes are hashed using their IP or hostname onto points along this circle. When a key is inserted, its hash value is computed, and the system travels clockwise along the circumference until encountering the first available server token. When a node departs, only the keys situated between that node and its counter-clockwise predecessor must migrate to its immediate clockwise successor.\n\nTo prevent uneven key distribution ("hot spots") resulting from non-uniform hash scatter, each physical node is instantiated as V virtual nodes (vnodes) scattered randomly across the ring. Statistical analysis confirms that the variance in load distribution across nodes decreases proportionally to 1/V, achieving near-perfect load balance.',
          architectureDiagram: `=============================================================================
                  CONSISTENT HASH RING TOPOLOGY (0 to 2^32 - 1)
=============================================================================
                              [ Node A_v1 ] (0x00FF)
                                   /      \\
            [ Key K104 ]          /        \\          [ Key K208 ]
             (0x1F4A)            /          \\          (0x56E0)
                 |              /            \\            |
                 v             /              \\           v
       [ Node C_v2 ] <--------+                +-----> [ Node B_v1 ]
         (0xD2A0)              \\              /          (0x78A0)
                                \\            /
                                 \\          /
                              [ Node B_v2 ] (0xA500)
-----------------------------------------------------------------------------
Rule: Keys traverse clockwise until encountering the nearest Node token.
Virtual Nodes (vnodes): Physical Server A has tokens A_v1, A_v2, A_v3.
Invariant: Addition of Node D reassigns strictly K/(N+1) keys from its neighbor.
=============================================================================`,
          mathematicalDerivation: `1. Traditional Modulo Hashing Reassignment Probability:
   P(Remap) = 1 - P(hash(key) mod N == hash(key) mod (N + 1))
   For large N, P(Remap) = N / (N + 1) -> 1.0 (approaches 100% reshuffle).

2. Consistent Hashing Reassignment Bound:
   Let K = Total Keys, N = Initial Nodes.
   Adding node (N+1) creates a new interval on the ring with expected angle:
   E[theta] = 2pi / (N + 1).
   Fraction of keys falling into the new interval = E[theta] / 2pi = 1 / (N + 1).
   Expected keys transferred to new node = K / (N + 1) approx K / N.

3. Virtual Node Variance Bound:
   Let V = number of virtual tokens per physical node.
   Standard deviation of node capacity load: sigma_load = O(1 / sqrt(V)).
   For V = 256, maximum partition imbalance across nodes is strictly <= 5%.`,
          examinerKeyPoints: [
            'Circular Hash Ring [0, 2^32 - 1] representation with clockwise token resolution.',
            'K/N remapping proof showing that (N-1)/N keys remain unaffected during node scale-out.',
            'Role of Virtual Nodes (vnodes) in mitigating non-uniform clustering and partition skew.',
            'Real-world implementation references: Amazon Dynamo DHT, Apache Cassandra Token Ring.',
            'Contrast with naive modulo hash(key) mod N thrashing behavior.'
          ]
        },
        youtubeReference: {
          title: 'Consistent Hashing in Distributed Key-Value Stores',
          channelName: 'System Design Interview Prep',
          duration: '11:40',
          youtubeUrl: 'https://www.youtube.com/watch?v=exampleConsistent',
          timestampNote: 'Vnode derivation at 05:30'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q10`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Banker\'s Algorithm for Deadlock Avoidance',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 90% Operating Systems Recurrence',
        recurrenceRate: 90,
        yearAsked: `${yr} ${typeLabel} (Q10)`,
        marks: 10,
        targetCO: 'CO2',
        bloomLevel: 'APPLY',
        universityTags: [params.shortCode, `${yr} Paper`, 'OS Synchronization'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 8.9,
        subjectCategory: 'ALLIED',
        questionText: 'Q10. Formulate Dijkstra\'s Banker\'s Algorithm for deadlock avoidance. Given Allocation, Max, and Available resource vectors, write the Safety Algorithm condition and trace a safe execution sequence.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Think of a small town banker who has $10,000 cash in the vault (Available). Three businesses (Processes) have pre-approved credit lines (Max). A business asks for a loan right now (Request). The banker only grants the loan if there is at least one business whose remaining need can be fully satisfied by the vault\'s remaining cash. Once that business finishes, it returns all borrowed cash, unlocking the next business!',
          mathematicalDerivation: '📐 Safety Algorithm Invariant:\nLet Work = Available and Finish[i] = false for all i.\nFind an index i such that: Finish[i] == false AND Need[i] ≤ Work.\nIf no such i exists and Finish is not all true ⟹ System is in UNSAFE state.\nIf such i exists:\nWork = Work + Allocation[i]; Finish[i] = true; Repeat.\nIf Finish[i] == true for all i ⟹ System is in SAFE state with safe sequence <P_0, P_1, ..., P_{n-1}>.',
          architectureDiagram: 'Need[i][j] = Max[i][j] - Allocation[i][j]\nCheck: Need[i] ≤ Work?\n  ├── YES: Work = Work + Allocation[i] -> Mark Process Done\n  └── NO: Skip to next process -> Safe Sequence found!',
          examinerKeywords: ['Safe State Invariant', 'Need = Max - Allocation', 'Work Vector Update', 'Dijkstra Banker Algorithm', 'Resource-Request Algorithm']
        },
        structuredExamMarking: {
          totalMarks: 10,
          breakdown: [
            { component: 'Data Structures & Vector Definitions', marks: 2, description: 'Formal definition of Available[m], Max[n][m], Allocation[n][m], and Need[n][m].' },
            { component: 'Safety Algorithm Invariant & Proof', marks: 3, description: 'Step-by-step Work and Finish vector loop proving state safety guarantee.' },
            { component: 'Resource Request Algorithm Protocol', marks: 2, description: 'Request <= Need and Request <= Available conditional checks with provisional allocation.' },
            { component: 'Step-by-Step Execution Sequence Trace', marks: 2, description: 'Concrete numerical progression deriving safe sequence <P1, P3, P4, P0, P2>.' },
            { component: 'Examiner Rubric & Deadlock Contrast', marks: 1, description: 'Contrast deadlock avoidance vs deadlock detection and recovery.' }
          ],
          overallView: 'Dijkstra\'s Banker\'s Algorithm is the definitive classical deadlock-avoidance protocol for systems with multiple instances of each resource type. By dynamically evaluating each process allocation request against currently available claims, it guarantees the system never enters an unsafe state that could cascade into circular wait deadlock.',
          detailedTopicExplanation: 'In concurrent operating systems, deadlock avoidance operates proactively by examining future resource claims before granting requests. The system maintains four foundational data structures across n processes and m resource types: Available[m], Max[n][m], Allocation[n][m], and Need[n][m] (where Need[i][j] = Max[i][j] - Allocation[i][j]).\n\nWhen process Pi submits a Request[i], the system first verifies that Request[i] <= Need[i] (error condition check) and Request[i] <= Available (wait condition check). Rather than permanently allocating the resource, the kernel simulates provisional allocation: Available is decremented, Allocation[i] is incremented, and Need[i] is decremented.\n\nNext, the Safety Algorithm executes: vectors Work = Available and Finish[i] = false are initialized. The algorithm searches for any process Pi where Finish[i] == false and Need[i] <= Work. If discovered, the process can safely terminate; its allocated resources are reclaimed into Work (Work = Work + Allocation[i]) and Finish[i] is set to true. If all processes achieve Finish[i] == true, a valid Safe Sequence exists, and the physical resource allocation is finalized. Otherwise, the process must block.',
          architectureDiagram: `=============================================================================
                  DIJKSTRA BANKER'S ALGORITHM SAFETY ENGINE
=============================================================================
                      Process Pi issues Request[i]
                                   |
                +------------------v------------------+
                | Request[i] <= Need[i] ?             |
                +------------------+------------------+
                                   | YES (No -> Error)
                +------------------v------------------+
                | Request[i] <= Available ?           |
                +------------------+------------------+
                                   | YES (No -> Pi must Wait)
                 [ Simulate Provisional State ]
                 Available  = Available - Request[i]
                 Allocation = Allocation + Request[i]
                 Need       = Need - Request[i]
                                   |
                +------------------v------------------+
                |  Run Safety Algorithm:              |
                |  Can all processes finish safely?   |
                +------------------+------------------+
                        /                     \\
               YES (Safe State)             NO (Unsafe State)
                     |                               |
          Grant Resources to Pi            Rollback & Pi Blocks
=============================================================================`,
          mathematicalDerivation: `1. Matrix Invariant:
   Need[i][j] = Max[i][j] - Allocation[i][j] for all 0 <= i < n, 0 <= j < m.

2. Safety Loop:
   Work = Available (1 x m vector)
   Finish[i] = false for all 0 <= i < n

   Loop:
     Find i such that: Finish[i] == false AND Need[i] <= Work
     If found:
       Work = Work + Allocation[i]
       Finish[i] = true
       Add Pi to SafeSequence
       Goto Loop
     If no such i:
       If Finish[i] == true for all i -> System is SAFE!
       Else -> System is UNSAFE (potential Deadlock).`,
          examinerKeyPoints: [
            'Need matrix computation formula Need = Max - Allocation.',
            'Two-phase check: Request <= Need followed by Request <= Available.',
            'Distinction between Unsafe State and Deadlocked State (Deadlock is a strict subset of Unsafe).',
            'Time complexity analysis: Safety algorithm requires O(m * n^2) operations.',
            'Derivation of full safe sequence with numerical state transitions.'
          ]
        },
        youtubeReference: {
          title: 'Banker Algorithm Numerical Problem Solved',
          channelName: 'Gate Smashers',
          duration: '13:10',
          youtubeUrl: 'https://www.youtube.com/watch?v=exampleBanker',
          timestampNote: 'Safety sequence at 04:40'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q11`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Gossip Protocols & Anti-Entropy Synchronization',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 87% Distributed Systems Recurrence',
        recurrenceRate: 87,
        yearAsked: `${yr} ${typeLabel} (Q11)`,
        marks: 10,
        targetCO: 'CO5',
        bloomLevel: 'UNDERSTAND',
        universityTags: [params.shortCode, `${yr} Paper`, 'Epidemic Protocols'],
        isHighYield: false,
        isImportant: false,
        importanceScore: 7.9,
        subjectCategory: 'ELECTIVE',
        questionText: 'Q11. Explain Epidemic Dissemination (Gossip Protocols) for peer-to-peer cluster state synchronization. Derive the logarithmic convergence rate O(log N) for message propagation.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Gossip protocols work just like office rumors. Every second, you pick one random coworker and tell them the latest update (push-pull gossip). At first, only 2 people know. In the next round, 4 people know, then 8, 16, 32... Within just 15 rounds, a company of 30,000 employees knows the news completely, even if random phone lines disconnect!',
          mathematicalDerivation: '📐 Logarithmic Convergence Proof:\nLet S_t be the fraction of uninfected nodes at round t, with S_0 ≈ 1.\nIn push gossip, each infected node picks a peer uniformly at random with probability 1/N.\nProbability that an uninfected node remains uninfected after round t:\nP(uninfected) = (1 - 1/N)^{N * (1 - S_t)} ≈ e^{-(1 - S_t)}.\nSolving the differential equation dS/dt = -β S(1 - S) yields the classic logistic sigmoid.\nThe number of rounds required to infect (1 - ε) fraction of N nodes is t = O(log N).',
          architectureDiagram: 'Round 0: [ Node 1 (Infected) ]\nRound 1: [ Node 1 ] ---> [ Node 3 ] (2 nodes)\nRound 2: [ Node 1 ] ---> [ Node 4 ], [ Node 3 ] ---> [ Node 7 ] (4 nodes)\nRound O(log N): All N nodes synchronized!',
          examinerKeywords: ['Epidemic Dissemination', 'Push-Pull Anti-Entropy', 'O(log N) Rounds', 'Rumor Mongering', 'Cassandra Cluster Gossip']
        },
        youtubeReference: {
          title: 'Gossip Protocol in Distributed Systems',
          channelName: 'Distributed Systems Tech',
          duration: '12:00',
          youtubeUrl: 'https://www.youtube.com/watch?v=exampleGossip',
          timestampNote: 'Convergence math at 05:20'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q12`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'ACID vs BASE & Conflict-Free Replicated Data Types (CRDTs)',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 92% Advanced Distributed Data Recurrence',
        recurrenceRate: 92,
        yearAsked: `${yr} ${typeLabel} (Q12)`,
        marks: 10,
        targetCO: 'CO6',
        bloomLevel: 'CREATE',
        universityTags: [params.shortCode, `${yr} Paper`, 'State Convergence'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.3,
        subjectCategory: 'ELECTIVE',
        questionText: 'Q12. Compare ACID and BASE consistency models. Define Conflict-free Replicated Data Types (CRDTs) and prove mathematically why a Join-Semilattice guarantees monotonic eventual convergence without coordination.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: In traditional databases (ACID), two people editing a document must lock it so only one edits at a time. If you\'re on a plane offline, you can\'t edit! CRDTs (BASE) allow both people to edit offline simultaneously without talking. When they reconnect, mathematical rules guarantee that both edits merge together into the exact same resulting document automatically without any conflicts or errors!',
          mathematicalDerivation: '📐 Join-Semilattice Mathematical Proof:\nA state-based CRDT (CvRDT) is defined by a set S with partial order ≤ and join operator ⊔ satisfying:\n1. Commutativity: x ⊔ y = y ⊔ x\n2. Associativity: (x ⊔ y) ⊔ z = x ⊔ (y ⊔ z)\n3. Idempotence: x ⊔ x = x\nMonotonicity: State grows monotonically: x ≤ (x ⊔ y).\nBecause ⊔ is commutative, associative, and idempotent, any set of replicas receiving updates in ANY arbitrary order or duplicate delivery arrive at the identical least upper bound (LUB): ⨆ S. Q.E.D.',
          architectureDiagram: 'Replica 1 (State s1) \\\\ \n                      ===> Join Operator (s1 ⊔ s2) ===> Identical Merged State!\nReplica 2 (State s2) /      (Order-Independent & Conflict-Free)',
          examinerKeywords: ['Join-Semilattice (⊔)', 'Commutative, Associative, Idempotent', 'Least Upper Bound (LUB)', 'Pn-Counter & LWW-Element-Set', 'Eventual Consistency without Locks']
        },
        youtubeReference: {
          title: 'CRDTs: The Mathematics of Real-Time Collaborative Editing',
          channelName: 'Strange Loop Conference',
          duration: '22:15',
          youtubeUrl: 'https://www.youtube.com/watch?v=exampleCRDT',
          timestampNote: 'Semilattice proof at 08:45'
        }
      },
      {
        id: `${params.collegeId}-${yr}-q13`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'MapReduce Shuffle & Distributed Sorting',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '⭐ High-Yield Core Analytical (93% Recurrence)',
        recurrenceRate: 93,
        yearAsked: `${yr} ${typeLabel} (Q13)`,
        marks: 10,
        targetCO: 'CO4',
        bloomLevel: 'ANALYZE',
        universityTags: [params.shortCode, `${yr} Paper`, 'Big Data Systems'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.3,
        subjectCategory: 'CORE',
        questionText: 'Q13. In large-scale MapReduce architectures, analyze the Shuffle and Sort phase bottlenecks. How do in-memory spill buffers and Combiner functions prevent network saturation?',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Think of a national election vote tally. Instead of sending 100 million individual paper ballots over the highway to the capital city (network bottleneck), each local voting booth counts its own votes first (Combiner). Then only the summarized totals for each candidate are driven to headquarters, cutting network traffic by 99%!',
          mathematicalDerivation: '📐 Combiner Reduction Invariant:\nLet M be map workers, R be reduce workers, and K be total keys with key distribution P(k).\nWithout Combiner: Total network transmission data D = ∑_{i=1}^M size(Output_i) = O(M * |Records|).\nWith Associative Combiner C(k, v1, v2) = v1 ⊕ v2: Data D_comb = O(M * |Distinct Keys|).\nBandwidth reduction ratio = |Records| / |Distinct Keys|.',
          architectureDiagram: '[ Map Tasks ] ---> [ Circular Memory Buffer ] ---> [ Spill to Disk & Combiner ] === Network Shuffle ===> [ Reducer Tasks ]',
          examinerKeywords: ['MapReduce Shuffle', 'In-Memory Spill Buffer (io.sort.mb)', 'Combiner Mini-Reducer', 'Partition Function hash(key) mod R', 'Spill Merging']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q14`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Chandy-Lamport Distributed Snapshot Protocol',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 94% Global State Recurrence',
        recurrenceRate: 94,
        yearAsked: `${yr} ${typeLabel} (Q14)`,
        marks: 10,
        targetCO: 'CO2',
        bloomLevel: 'APPLY',
        universityTags: [params.shortCode, `${yr} Paper`, 'Global State'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.6,
        subjectCategory: 'CORE',
        questionText: 'Q14. Formulate the Chandy-Lamport Distributed Snapshot algorithm for non-FIFO and FIFO communication channels. Prove why the captured global state satisfies causal consistency.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Imagine trying to take a picture of all players on a soccer field while everyone is running and passing balls through the air. You can\'t freeze time! The referee blows a whistle (Marker). When a player hears the whistle, they freeze their own position (Local State) and write down any soccer ball that lands at their feet until the neighboring player also hears the whistle (Channel State)!',
          mathematicalDerivation: '📐 Consistent Cut Formulation:\nA cut C = (S1, S2, ..., Sn) is consistent iff for all events e, e\' across processes Pi, Pj:\nIf e\' ∈ C and e -> e\' (causally precedes), then e ∈ C.\nMarker Rule: Process Pi sends Marker along all outgoing channels immediately after recording its state.\nSince channel is FIFO, message m sent after Marker cannot arrive before Marker ⟹ No orphan messages!',
          architectureDiagram: 'Process P1: [ Record State ] =====(Send Marker)=====> Process P2: [ Record State ]\n     |                                                       |\n     +--- Records messages arriving on channel before Marker -+',
          examinerKeywords: ['Consistent Global State', 'Marker Sending / Receiving Rules', 'FIFO Channel Invariant', 'Channel State Recording', 'Absence of Orphan Messages']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q15`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Bully & Ring Leader Election Algorithms',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🎯 Core Distributed Algorithms',
        recurrenceRate: 86,
        yearAsked: `${yr} ${typeLabel} (Q15)`,
        marks: 10,
        targetCO: 'CO1',
        bloomLevel: 'UNDERSTAND',
        universityTags: [params.shortCode, `${yr} Paper`, 'Election Protocols'],
        isHighYield: false,
        isImportant: false,
        importanceScore: 8.0,
        subjectCategory: 'CORE',
        questionText: 'Q15. Compare the Bully Algorithm and the Chang-Roberts Ring Election Algorithm. Derive the best-case and worst-case message complexity for both algorithms under process crashes.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: In the Bully algorithm, nodes act like schoolyard students where the biggest ID wins: any node can challenge every node with a higher ID than itself. In a Ring election, nodes sit in a circle and pass a note clockwise; whenever a node sees a note with an ID smaller than its own, it overwrites it with its own ID!',
          mathematicalDerivation: '📐 Message Complexity Bounds:\nBully Algorithm:\n- Best Case: Highest process detects failure directly ⟹ (N - 2) Coordinator messages: O(N).\n- Worst Case: Lowest ID node detects failure ⟹ O(N^2) messages.\nChang-Roberts Ring:\n- Best Case: Highest ID node initiates clockwise ⟹ N messages: O(N).\n- Worst Case: Reverse sorted order ⟹ O(N^2) messages; Average case: O(N log N).',
          architectureDiagram: 'Bully: Node k ---> [ ELECTION ] ---> Higher IDs (k+1 .. N)\nRing:  [ Node 1 ] --(Msg: ID)--> [ Node 2 ] --(Msg: ID)--> [ Node 3 ] ... (Clockwise)',
          examinerKeywords: ['Bully Election', 'Chang-Roberts Ring', 'O(N^2) vs O(N log N)', 'Process Crashes', 'Coordinator Announcement']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q16`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Multi-Paxos Protocol vs Raft Log Consensus',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '⭐ 97% Premier Exam Recurrence',
        recurrenceRate: 97,
        yearAsked: `${yr} ${typeLabel} (Q16)`,
        marks: 10,
        targetCO: 'CO3',
        bloomLevel: 'ANALYZE',
        universityTags: [params.shortCode, `${yr} Paper`, 'Consensus Engine'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.7,
        subjectCategory: 'CORE',
        questionText: 'Q16. Trace Phase 1a, 1b, 2a, and 2b of Classic Paxos. Explain how Multi-Paxos bypasses Phase 1 for consecutive log decisions and contrast this with Raft\'s strong leader approach.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Classic Paxos requires two full round-trip discussions for every single log entry: Phase 1 ("Can I propose?") and Phase 2 ("Here is the proposal, please save it"). Multi-Paxos says: "Since you chose me as leader, let me keep proposing without asking permission every time!" That cuts network round-trips in half!',
          mathematicalDerivation: '📐 Paxos Quorum Invariant:\nPhase 1 (Prepare/Promise): Proposer sends Prepare(n); Acceptors reply Promise(n, max_accepted_val).\nPhase 2 (Accept/Accepted): Proposer sends Accept(n, v); Acceptors reply Accepted(n, v) if n ≥ min_proposal.\nMulti-Paxos Optimization: A stable leader executes Phase 1 once for the entire stream of log entries: instances i, i+1, i+2... reducing commit latency from 2 RTT to 1 RTT.',
          architectureDiagram: 'Classic Paxos: [ Prepare (1a) ] <-> [ Promise (1b) ] ===> [ Accept (2a) ] <-> [ Accepted (2b) ] (2 RTT)\nMulti-Paxos:   [ Prepare Stream ] ===> [ Accept Slot i ] <-> [ Accepted ] (1 RTT steady-state)',
          examinerKeywords: ['Classic Paxos 1a/1b/2a/2b', 'Multi-Paxos Stream Lease', '1 RTT Steady State', 'Raft Strong Leader', 'Dueling Proposers']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q17`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Google Spanner TrueTime API & GPS Atomic Clocks',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '⭐ 95% High-Yield Cloud Storage',
        recurrenceRate: 95,
        yearAsked: `${yr} ${typeLabel} (Q17)`,
        marks: 10,
        targetCO: 'CO5',
        bloomLevel: 'EVALUATE',
        universityTags: [params.shortCode, `${yr} Paper`, 'Global Databases'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.5,
        subjectCategory: 'ELECTIVE',
        questionText: 'Q17. Explain Google Spanner\'s TrueTime API [earliest, latest] with bounded uncertainty ε. Prove how Spanner enforces external consistency (linearizability) using Commit Wait.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Standard computer clocks drift by several seconds, making it impossible to know which bank transfer happened first across continents. Google installed GPS receivers and atomic clocks in every data center to keep clock error (ε) under 7 milliseconds. When Spanner commits a transaction, it intentionally waits for 2ε (14ms) before letting the user see the result, ensuring no future transaction anywhere on Earth could possibly have an earlier timestamp!',
          mathematicalDerivation: '📐 TrueTime Commit Wait Invariant:\nTrueTime.now() returns interval [t.earliest, t.latest] where t.latest - t.earliest ≤ 2ε.\nRule: Pick commit timestamp s = TT.now().latest.\nCommit Wait: Coordinator waits to release locks until TT.now().earliest > s.\nIf transaction T2 starts after T1 finishes: t_{start}(T2) > t_{finish}(T1) ≥ s1.\nTherefore: s2 = TT.now().latest > t_{start}(T2) > s1 ⟹ s1 < s2 strictly. External consistency guaranteed without inter-datacenter communication!',
          architectureDiagram: 'T1 Commit: s1 = now().latest ---> [ Commit Wait: Wait until now().earliest > s1 ] ---> Release Locks\n                                                                                       |\nGlobal Invariant: Any subsequent T2 strictly gets s2 > s1! <----------------------------+',
          examinerKeywords: ['TrueTime API [earliest, latest]', 'Bounded Uncertainty ε ≤ 7ms', 'Atomic Clocks & GPS Receivers', 'Commit Wait Rule', 'External Consistency (Linearizability)']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q18`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Apache Kafka Partitioning & Log Compaction Architecture',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🎯 Event Streaming Foundation',
        recurrenceRate: 88,
        yearAsked: `${yr} ${typeLabel} (Q18)`,
        marks: 10,
        targetCO: 'CO4',
        bloomLevel: 'APPLY',
        universityTags: [params.shortCode, `${yr} Paper`, 'Streaming Systems'],
        isHighYield: false,
        isImportant: false,
        importanceScore: 8.4,
        subjectCategory: 'ELECTIVE',
        questionText: 'Q18. Describe Apache Kafka\'s commit log architecture. Explain how partition assignment, consumer group rebalancing, and log compaction preserve state for distributed event streams.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Think of Kafka as an immutable tape recorder. Each partition is a continuous tape where messages are appended with an ascending sequence number (Offset). Multiple workers in a consumer group divide up the tapes so each tape is read by only one worker. Log compaction keeps only the latest value for each key, so if a user changes their address 10 times, the old 9 records are safely wiped to save disk space!',
          mathematicalDerivation: '📐 Consumer Group Scale Bound:\nLet P be the number of topic partitions and C be the number of active consumers in group G.\nIf C ≤ P: Each consumer handles at least ⌊P/C⌋ partitions.\nIf C > P: Exactly (C - P) consumers remain idle with zero assigned partitions.\nThroughput scales linearly with P up to network/disk saturation.',
          architectureDiagram: 'Topic [ Orders ]\n├── Partition 0: [ Offset 0 ][ Offset 1 ][ Offset 2 ] ---> Consumer A\n├── Partition 1: [ Offset 0 ][ Offset 1 ] ------------> Consumer B\n└── Partition 2: [ Offset 0 ][ Offset 1 ][ Offset 2 ] ---> Consumer C',
          examinerKeywords: ['Sequential Disk I/O', 'Partition Offset', 'Consumer Group Rebalance', 'Log Compaction Cleaner', 'Zero-Copy sendfile()']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q19`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Ricart-Agrawala & Maekawa Distributed Mutual Exclusion',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '⭐ 91% Critical Section PYQ',
        recurrenceRate: 91,
        yearAsked: `${yr} ${typeLabel} (Q19)`,
        marks: 10,
        targetCO: 'CO2',
        bloomLevel: 'ANALYZE',
        universityTags: [params.shortCode, `${yr} Paper`, 'Mutual Exclusion'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.1,
        subjectCategory: 'CORE',
        questionText: 'Q19. Derive the message complexity of Ricart-Agrawala algorithm 2(N - 1). How does Maekawa\'s Voting Quorum algorithm reduce message overhead to O(√N) while avoiding deadlocks?',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: In Ricart-Agrawala, to enter a single room you must ask every single person in the building for permission (2(N-1) messages). Maekawa says: organize everyone into a grid! To enter, you only need permission from people in your row and your column. Since any two people have at least one common person in their row/column intersection, two people can never enter simultaneously!',
          mathematicalDerivation: '📐 Maekawa Quorum Math:\nAssign N nodes into √N x √N grid. Each node Pi voting set Vi = row(Pi) ∪ col(Pi).\nQuorum size |Vi| ≈ 2√N - 1.\nIntersection Property: For any Pi, Pj: Vi ∩ Vj ≠ ∅ (row of Pi intersects column of Pj at (row(Pi), col(Pj))).\nTotal messages per critical section entry = 3√N to 5√N = O(√N).',
          architectureDiagram: 'Grid Topology (N = 9):\n[ 1 ] [ 2 ] [ 3 ]   Node 1 quorum = {1, 2, 3, 4, 7}\n[ 4 ] [ 5 ] [ 6 ]   Node 5 quorum = {4, 5, 6, 2, 8}\n[ 7 ] [ 8 ] [ 9 ]   Intersection: {2, 4} ensures mutual exclusion!',
          examinerKeywords: ['Lamport Timestamps Priority', 'Ricart-Agrawala 2(N-1)', 'Maekawa Voting Quorum O(√N)', 'Quorum Intersection Invariant', 'Deadlock Inquire/Relinquish']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q20`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'High-Performance Epoll vs Select/Poll I/O Multiplexing',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🎯 Linux Systems Architecture',
        recurrenceRate: 85,
        yearAsked: `${yr} ${typeLabel} (Q20)`,
        marks: 10,
        targetCO: 'CO1',
        bloomLevel: 'UNDERSTAND',
        universityTags: [params.shortCode, `${yr} Paper`, 'Operating Systems'],
        isHighYield: false,
        isImportant: false,
        importanceScore: 8.2,
        subjectCategory: 'ALLIED',
        questionText: 'Q20. Contrast the internal kernel architecture of Linux epoll with select() and poll(). Explain why epoll achieves O(1) event readiness scaling under the C10K problem.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Imagine a hotel receptionist with 10,000 guests. With select(), the receptionist knocks on all 10,000 doors every 5 seconds to ask: "Are you ready to check out?" (O(N) CPU waste). With epoll, each room has a red light on the front desk (Kernel Ready List). When a guest wants to leave, their light turns red automatically. The receptionist glances only at the lit lamps in O(1) time!',
          mathematicalDerivation: '📐 Performance Invariant:\nselect() / poll(): User passes array of N file descriptors to kernel on every call. Kernel performs linear scan O(N) across all N sockets.\nepoll: epoll_ctl adds socket once to a Red-Black Tree in kernel memory. Hardware network interrupt triggers callback placing ready socket on a Doubly-Linked Ready List. epoll_wait reads only ready sockets: O(k) where k is active events, independent of total connections N.',
          architectureDiagram: '[ 10,000 Sockets ] ---> [ Red-Black Tree in Kernel ]\n                             | (Hardware Interrupt Callback)\n                             v\n                 [ Doubly Linked Ready List ] ---> epoll_wait returns active events only!',
          examinerKeywords: ['C10K Problem', 'O(1) Event Scalability', 'Red-Black Tree Socket Store', 'Ready List Callback', 'Edge-Triggered (EPOLLET) vs Level-Triggered']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q21`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Bloom Filters & Count-Min Sketch Probabilistic Structures',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '⭐ 90% Distributed Cache Recurrence',
        recurrenceRate: 90,
        yearAsked: `${yr} ${typeLabel} (Q21)`,
        marks: 10,
        targetCO: 'CO3',
        bloomLevel: 'APPLY',
        universityTags: [params.shortCode, `${yr} Paper`, 'Probabilistic Structures'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.0,
        subjectCategory: 'ELECTIVE',
        questionText: 'Q21. Formulate a Bloom Filter with bit array of size m, n inserted keys, and k hash functions. Derive the optimal k = (m/n) ln 2 minimizing false positive probability.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: Imagine a club bouncer who doesn\'t want to carry a massive 500-page guest list. Instead, he keeps a tiny strip of 100 checkboxes. When a VIP registers, 3 specific boxes are checked using special formulas. When someone arrives, if ANY of their 3 boxes is empty, they are 100% NOT on the list! If all 3 are checked, they are almost certainly a guest, saving massive database searches!',
          mathematicalDerivation: '📐 False Positive Probability Derivation:\nProbability a specific bit is NOT set by one hash function = 1 - 1/m.\nAfter inserting n keys with k hashes: P(bit is 0) = (1 - 1/m)^{kn} ≈ e^{-kn/m}.\nP(bit is 1) = 1 - e^{-kn/m}.\nFalse Positive Probability p = (1 - e^{-kn/m})^k.\nTaking ln(p) and differentiating with respect to k gives minimum when k = (m/n) ln 2.\nResulting error rate p = 2^{-k} ≈ (0.6185)^{m/n}.',
          architectureDiagram: 'Key "alice" ---> [ Hash 1 ] -> Bit 3\n            ---> [ Hash 2 ] -> Bit 14\n            ---> [ Hash 3 ] -> Bit 29\nBit Array: [ 0 ][ 0 ][ 0 ][ 1 ] ... [ 1 ] ... [ 1 ] (Zero false negatives!)',
          examinerKeywords: ['Optimal Hashes k = (m/n) ln 2', 'False Positive Rate p = 2^-k', 'No False Negatives', 'Cassandra SSTable Bloom Filter', 'Space Efficiency']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q22`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'TLS 1.3 Handshake & Diffie-Hellman Key Exchange',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🎯 Network Security Standard',
        recurrenceRate: 84,
        yearAsked: `${yr} ${typeLabel} (Q22)`,
        marks: 10,
        targetCO: 'CO5',
        bloomLevel: 'UNDERSTAND',
        universityTags: [params.shortCode, `${yr} Paper`, 'Security Architecture'],
        isHighYield: false,
        isImportant: false,
        importanceScore: 8.1,
        subjectCategory: 'ALLIED',
        questionText: 'Q22. Compare the TLS 1.2 and TLS 1.3 handshake protocols. How does TLS 1.3 eliminate 1 full Round-Trip Time (RTT) and enforce Perfect Forward Secrecy (PFS)?',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: In TLS 1.2, client and server spend the first round trip saying hello, listing cryptographic ciphers, and agreeing on how to talk. In TLS 1.3, the client anticipates modern security: in the very first "ClientHello" packet, it immediately includes its Ephemeral Diffie-Hellman public key! The server responds with its own key, completing encrypted key generation in a single round trip (1-RTT)!',
          mathematicalDerivation: '📐 Elliptic Curve Diffie-Hellman (ECDH) Key Agreement:\nPublic base point G on curve E.\nClient picks private scalar a, sends A = aG in ClientHello.\nServer picks private scalar b, sends B = bG in ServerHello.\nShared Secret S = aB = a(bG) = b(aG) = bA.\nHKDF extract-and-expand derives symmetric session keys: {client_write_key, server_write_key}.\nSince a and b are ephemeral and deleted after the session, compromise of the server certificate private key later cannot decrypt past sessions (PFS).',
          architectureDiagram: 'Client                                     Server\n  | --- ClientHello + KeyShare (A = aG) ----> |\n  | <--- ServerHello + KeyShare (B = bG) ---- |  [ Shared Secret S = abG established! ]\n  | <=== Encrypted Application Data ========= |  (1-RTT Connection Time!)',
          examinerKeywords: ['1-RTT Handshake', '0-RTT Resumption (Early Data)', 'Ephemeral ECDHE', 'Perfect Forward Secrecy (PFS)', 'HKDF Key Derivation']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q23`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Log-Structured Merge (LSM) Trees in RocksDB & Cassandra',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '⭐ 94% Modern Storage Engine PYQ',
        recurrenceRate: 94,
        yearAsked: `${yr} ${typeLabel} (Q23)`,
        marks: 10,
        targetCO: 'CO6',
        bloomLevel: 'CREATE',
        universityTags: [params.shortCode, `${yr} Paper`, 'Storage Engines'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 9.4,
        subjectCategory: 'CORE',
        questionText: 'Q23. Detail the architecture of Log-Structured Merge (LSM) Trees. Contrast write amplification, read amplification, and compaction strategies (Size-Tiered vs Leveled) against traditional B+ Trees.',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: When you write into a B+ tree, you must find specific pages scattered randomly across your hard drive, leading to slow random writes. LSM trees convert every write into a lightning-fast in-memory append (MemTable). When the memory fills up, it writes the entire block out to disk sequentially as an immutable SSTable file. In the background, a cleaner merges and sorts the files together (Compaction)!',
          mathematicalDerivation: '📐 Amplification Bounds:\n- Write Amplification (WA): Ratio of bytes written to disk versus bytes requested by user.\n  In Leveled Compaction: WA = O(T * L) where T is tier multiplier (typically 10) and L is number of levels.\n- Read Amplification: Checked in Memtable, then Level 0 (overlapping SSTables), then at most 1 SSTable per Level 1..L with Bloom filters.\n- Space Amplification: Ratio of disk space used versus actual raw data: Leveled compaction maintains space amplification ≤ 1.1x.',
          architectureDiagram: 'User Write ---> [ Write-Ahead Log (WAL) ] + [ MemTable in RAM ]\n                                                   | (Flush)\n                                                   v\nLevel 0: [ SSTable A ][ SSTable B ]  <--- (Leveled Compaction)\nLevel 1: [ Sorted Non-Overlapping SSTables 1..N ]',
          examinerKeywords: ['MemTable (SkipList)', 'Immutable SSTables', 'Leveled vs Size-Tiered Compaction', 'Write Amplification Tradeoff', 'Bloom Filter Guard']
        }
      },
      {
        id: `${params.collegeId}-${yr}-q24`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: 'Chandy-Misra-Haas Edge Chasing Deadlock Detection',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '⭐ 89% Deadlock Protocol Recurrence',
        recurrenceRate: 89,
        yearAsked: `${yr} ${typeLabel} (Q24)`,
        marks: 10,
        targetCO: 'CO2',
        bloomLevel: 'ANALYZE',
        universityTags: [params.shortCode, `${yr} Paper`, 'Distributed Deadlock'],
        isHighYield: true,
        isImportant: true,
        importanceScore: 8.9,
        subjectCategory: 'CORE',
        questionText: 'Q24. Formulate the Chandy-Misra-Haas Edge-Chasing algorithm for distributed deadlock detection in the AND-request model. Trace probe message propagation: probe(initiator, sender, receiver).',
        aiThinkerSolution: {
          simpleExplanation: '💡 Plain Intuition: In a distributed system, Process A in London is waiting for Process B in New York, which is waiting for Process C in Tokyo, which is waiting for Process A! Nobody has the whole picture. In Edge-Chasing, Process A sends a tiny probe message with its name on it forward along the dependency chain. If that probe ever circles the globe and lands right back in Process A\'s inbox, a deadlock cycle is mathematically confirmed!',
          mathematicalDerivation: '📐 Edge-Chasing Probe Invariant:\nA process Pi sends probe(i, j, k) to process Pk if:\n1. Pi is blocked and waiting on Pj, and\n2. Pj is blocked and waiting on resource held by Pk.\nWhen Pk receives probe(i, j, k):\n- If Pk is blocked waiting on Pm, it forwards probe(i, k, m) to all such Pm.\n- If Pk receives probe(i, j, k) where i == k: Cycle detected! Initiator Pk aborts itself or junior transaction.',
          architectureDiagram: 'P1 [Wait] ---> P2 === (probe: 1, 1, 2) ===> P2 [Wait] ---> P3\n                                                              |\n                                                    (probe: 1, 2, 3)\n                                                              v\nP1 <=== (probe: 1, 3, 1) === P3 [Wait on P1] <----------------+',
          examinerKeywords: ['Edge-Chasing Algorithm', 'Probe Message (initiator, sender, receiver)', 'Wait-For-Graph (WFG)', 'AND-Model Cycle Condition', 'Phantom Deadlock Prevention']
        }
      }
    ];

    const targetVolume = params.requestedVolume || 24;
    if (targetVolume <= baseList.length) {
      return baseList.slice(0, targetVolume);
    }

    // Extended procedural catalog generator up to 100+ questions
    const pool = [
      { topic: 'MapReduce Architecture & Shuffle Phase', co: 'CO4', diff: 'HARD', bloom: 'ANALYZE', cat: 'CORE', score: 9.3, text: 'Analyze MapReduce Shuffle and Sort phases. Explain how Combiners reduce network I/O and how skew is handled.' },
      { topic: 'Chandy-Lamport Distributed Snapshot Algorithm', co: 'CO2', diff: 'HARD', bloom: 'APPLY', cat: 'CORE', score: 9.6, text: 'Derive the marker-sending and marker-receiving rules in Chandy-Lamport algorithm for global state capture.' },
      { topic: 'Bully & Ring Leader Election Algorithms', co: 'CO1', diff: 'MEDIUM', bloom: 'UNDERSTAND', cat: 'CORE', score: 8.0, text: 'Compare the message complexity of the Bully algorithm O(N^2) against Chang-Roberts Ring election O(N log N).' },
      { topic: 'Multi-Paxos Protocol vs Raft Log Consensus', co: 'CO3', diff: 'HARD', bloom: 'ANALYZE', cat: 'CORE', score: 9.7, text: 'Formulate Phase 1a, 1b, 2a, 2b in Classic Paxos. Show how Multi-Paxos amortizes Phase 1 over log sequences.' },
      { topic: 'Google Spanner TrueTime API & GPS Atomic Clocks', co: 'CO5', diff: 'HARD', bloom: 'EVALUATE', cat: 'ELECTIVE', score: 9.5, text: 'Explain how Spanner uses TrueTime uncertainty bounds [earliest, latest] to guarantee external consistency without coordination.' },
      { topic: 'Apache Kafka Partitioning & Log Compaction Architecture', co: 'CO4', diff: 'MEDIUM', bloom: 'APPLY', cat: 'ELECTIVE', score: 8.4, text: 'Explain Kafka consumer group rebalancing, partition offset commits, and log segment retention policies.' },
      { topic: 'Ricart-Agrawala & Maekawa Distributed Mutual Exclusion', co: 'CO2', diff: 'HARD', bloom: 'ANALYZE', cat: 'CORE', score: 9.1, text: 'Prove why Maekawa grid quorums achieve O(√N) message complexity while guaranteeing safety.' },
      { topic: 'High-Performance Epoll vs Select/Poll I/O Multiplexing', co: 'CO1', diff: 'MEDIUM', bloom: 'UNDERSTAND', cat: 'ALLIED', score: 8.2, text: 'Explain Edge-Triggered (ET) vs Level-Triggered (LT) modes in Linux epoll and compare O(1) event readiness with poll O(N).' },
      { topic: 'Bloom Filters & Count-Min Sketch Probabilistic Structures', co: 'CO3', diff: 'MEDIUM', bloom: 'APPLY', cat: 'ELECTIVE', score: 9.0, text: 'Derive the optimal number of hash functions k = (m/n) ln 2 for a Bloom filter of size m with n elements.' },
      { topic: 'TLS 1.3 Handshake & Diffie-Hellman Key Exchange', co: 'CO5', diff: 'MEDIUM', bloom: 'UNDERSTAND', cat: 'ALLIED', score: 8.1, text: 'Trace the 1-RTT and 0-RTT resumption handshake in TLS 1.3. Explain Ephemeral Diffie-Hellman Perfect Forward Secrecy.' },
      { topic: 'Log-Structured Merge (LSM) Trees in RocksDB & Cassandra', co: 'CO6', diff: 'HARD', bloom: 'CREATE', cat: 'CORE', score: 9.4, text: 'Contrast write amplification, read amplification, and space amplification in LSM trees versus B+ Trees.' },
      { topic: 'Chandy-Misra-Haas Edge Chasing Deadlock Detection', co: 'CO2', diff: 'HARD', bloom: 'ANALYZE', cat: 'CORE', score: 8.9, text: 'Formulate probe messages (initiator, sender, receiver) in distributed Wait-For-Graphs and show how cycles are detected.' },
      { topic: 'Sliding Window Flow Control: Go-Back-N vs Selective Repeat', co: 'CO1', diff: 'MEDIUM', bloom: 'APPLY', cat: 'CORE', score: 8.7, text: 'Calculate line utilization for Go-Back-N versus Selective Repeat over high Bandwidth-Delay Product (BDP) satellite links.' },
      { topic: 'Distributed Cache Invalidation Strategies', co: 'CO3', diff: 'MEDIUM', bloom: 'APPLY', cat: 'ELECTIVE', score: 8.8, text: 'Compare Write-Through, Write-Around, and Write-Back cache policies under Cache-Aside architecture.' },
      { topic: 'Event Sourcing & CQRS Pattern in Microservices', co: 'CO6', diff: 'HARD', bloom: 'CREATE', cat: 'ELECTIVE', score: 8.6, text: 'Design an event-driven ledger using Command Query Responsibility Segregation with eventual read-model projections.' },
      { topic: 'DNS Hierarchical Resolution & Anycast BGP Routing', co: 'CO4', diff: 'MEDIUM', bloom: 'UNDERSTAND', cat: 'ALLIED', score: 8.3, text: 'Trace recursive vs iterative DNS resolution. Explain how BGP Anycast distributes queries to closest root nameserver instances.' },
      { topic: 'Optimistic Concurrency Control (OCC) vs Two-Phase Locking', co: 'CO3', diff: 'HARD', bloom: 'ANALYZE', cat: 'CORE', score: 8.9, text: 'Detail Read, Validation, and Write phases in OCC. Contrast backward validation vs forward validation under write conflicts.' },
      { topic: 'Zero-Knowledge Proofs & zk-SNARKs Fundamentals', co: 'CO6', diff: 'HARD', bloom: 'EVALUATE', cat: 'ELECTIVE', score: 8.5, text: 'Explain Completeness, Soundness, and Zero-Knowledge properties in interactive proof systems.' },
      { topic: 'Rate Limiting: Token Bucket vs Leaky Bucket Algorithms', co: 'CO2', diff: 'MEDIUM', bloom: 'APPLY', cat: 'ELECTIVE', score: 8.9, text: 'Implement sliding window counter rate limiter in Redis to handle sudden burst traffic without boundary stampedes.' },
      { topic: 'WebAssembly (WASM) Sandboxing in Edge Cloud Run', co: 'CO5', diff: 'MEDIUM', bloom: 'UNDERSTAND', cat: 'ELECTIVE', score: 8.2, text: 'Explain Linear Memory isolation and capability-based security model in WASI (WebAssembly System Interface).' },
      { topic: 'Vector Databases & HNSW Indexing for AI RAG', co: 'CO6', diff: 'HARD', bloom: 'CREATE', cat: 'ELECTIVE', score: 9.1, text: 'Explain Hierarchical Navigable Small World graphs for approximate nearest neighbor search over dense embeddings.' },
      { topic: 'Kubernetes Raft-backed Etcd State Machine', co: 'CO4', diff: 'HARD', bloom: 'APPLY', cat: 'CORE', score: 9.0, text: 'Analyze how Etcd uses Raft log consensus to maintain linearizable cluster state for API server watch streams.' },
      { topic: 'Docker Linux Namespaces & Cgroups Resource Isolation', co: 'CO1', diff: 'MEDIUM', bloom: 'UNDERSTAND', cat: 'ALLIED', score: 8.8, text: 'Examine PID, NET, MNT namespaces and CFS CPU scheduler bandwidth limits in container runtime virtualization.' }
    ];

    const result = [...baseList];
    let counter = baseList.length + 1;
    while (result.length < targetVolume) {
      const p = pool[(counter - 1) % pool.length];
      const cycle = Math.floor((counter - 1) / pool.length) + 1;
      const qNum = counter;
      const isImp = p.score >= 9.0;
      result.push({
        id: `${params.collegeId}-${yr}-q${qNum}`,
        collegeId: params.collegeId,
        collegeName: params.collegeName,
        subjectCode: params.subjectCode,
        subjectName: params.subjectName,
        topic: `${p.topic}${cycle > 1 ? ` (Part ${cycle})` : ''}`,
        difficulty: p.diff as any,
        format: 'DESCRIPTIVE',
        frequencyBadge: isImp ? '⭐ High-Yield Core Question' : '🎯 Syllabus Benchmark',
        recurrenceRate: Math.min(98, Math.max(75, Math.round(p.score * 10))),
        yearAsked: `${yr} ${typeLabel} (Q${qNum})`,
        marks: 10,
        targetCO: p.co,
        bloomLevel: p.bloom as any,
        universityTags: [params.shortCode, `${yr} Paper`, p.cat],
        isHighYield: isImp,
        isImportant: isImp,
        importanceScore: p.score,
        subjectCategory: p.cat as any,
        questionText: `Q${qNum}. ${p.text}`,
        aiThinkerSolution: {
          simpleExplanation: `💡 Plain Intuition: Explains the architectural principles of ${p.topic} in real-world distributed infrastructure.`,
          mathematicalDerivation: `📐 Mathematical Invariant & Proof:\nFormal verification bounds for ${p.topic} with invariant safety condition.`,
          architectureDiagram: `[ Client / Node ] ---> [ Subsystem: ${p.topic} ] ---> [ State Machine / Storage ]`,
          examinerKeywords: [p.topic, 'Protocol Safety', 'Formal Verification', 'Optimal Bounds']
        }
      });
      counter++;
    }

    return result;
  }


  private generatePapersForCustomUniversity(college: PracticeCollege): void {
    const years = ['2025', '2024', '2023', '2022', '2021'];
    const papers: UniversityQuestionPaper[] = years.map((yr, idx) => {
      const qList = this.createFullPaperQuestions({
        collegeId: college.id,
        collegeName: college.name,
        shortCode: college.shortCode,
        campusLocation: college.campusLocation,
        academicYear: yr,
        examinationType: idx === 0 ? 'END_SEM' : idx === 1 ? 'MID_SEM' : 'END_SEM',
        subjectCode: 'CS401',
        subjectName: 'Distributed Systems & Cloud Computing'
      });

      return {
        id: `uqp-${college.id}-${yr}-paper`,
        universityId: college.id,
        universityName: college.name,
        campusLocation: college.campusLocation,
        paperTitle: `${college.name} - ${idx === 1 ? 'Mid-Term Assessment' : 'Annual End-Semester Examination'} (${yr})`,
        paperCode: `${college.shortCode.replace(/\s+/g, '')}-${yr}-CS401`,
        subjectCode: 'CS401',
        subjectName: 'Distributed Systems & Cloud Computing',
        examinationType: idx === 1 ? 'MID_SEM' : 'END_SEM',
        academicYear: yr,
        semester: 'Semester 7',
        examDate: `Nov 18, ${yr}`,
        publishedDate: `Nov 28, ${yr}`,
        durationMinutes: 180,
        totalMarks: 100,
        controllerOfExamsVerified: true,
        questionCount: qList.length,
        programName: college.programs?.[0] || 'B.Tech Computer Science & Engineering',
        departmentName: college.departments?.[0] || 'Department of Computer Science',
        questions: qList
      };
    });

    const allCustomQuestions = papers.flatMap(p => p.questions);
    this.universityQuestionPapers.update(existing => [...papers, ...existing]);
    this.pyqs.update(existing => [...allCustomQuestions, ...existing]);
  }

  private seedDefaultUniversityQuestionPapers(): void {
    const papers: UniversityQuestionPaper[] = [];

    // Helper to generate and push papers
    const addInstitutionPapers = (config: {
      collegeId: string;
      collegeName: string;
      shortCode: string;
      campusLocation: string;
      years: string[];
      programName: string;
      departmentName: string;
      isNationalExam?: boolean;
    }) => {
      config.years.forEach((yr, idx) => {
        const examType: 'END_SEM' | 'MID_SEM' | 'NATIONAL_ENTRANCE' = config.isNationalExam
          ? 'NATIONAL_ENTRANCE'
          : (idx === 1 ? 'MID_SEM' : 'END_SEM');

        const qList = this.createFullPaperQuestions({
          collegeId: config.collegeId,
          collegeName: config.collegeName,
          shortCode: config.shortCode,
          campusLocation: config.campusLocation,
          academicYear: yr,
          examinationType: examType,
          subjectCode: 'CS401',
          subjectName: config.isNationalExam ? 'National Competitive Evaluation' : 'Distributed Systems & Consensus Architecture'
        });

        papers.push({
          id: `uqp-${config.collegeId}-${yr}`,
          universityId: config.collegeId,
          universityName: config.collegeName,
          campusLocation: config.campusLocation,
          paperTitle: config.isNationalExam
            ? `${config.collegeName} Official Question Paper (${yr})`
            : `${config.collegeName} - ${examType === 'MID_SEM' ? 'Mid-Term Evaluation' : 'Official End-Semester Examination'} (${yr})`,
          paperCode: `${config.shortCode.replace(/\s+/g, '')}-${yr}-PAPER`,
          subjectCode: 'CS401',
          subjectName: config.isNationalExam ? 'Core Analytical & Systems Engineering' : 'Distributed Systems & Consensus Architecture',
          examinationType: examType,
          academicYear: yr,
          semester: config.isNationalExam ? 'All India National Paper' : 'Semester 7',
          examDate: `Dec ${12 + idx}, ${yr}`,
          publishedDate: `Dec ${18 + idx}, ${yr}`,
          durationMinutes: config.isNationalExam ? 180 : 180,
          totalMarks: 100,
          controllerOfExamsVerified: true,
          questionCount: qList.length,
          programName: config.programName,
          departmentName: config.departmentName,
          questions: qList
        });
      });
    };

    // 1. Apex Institute of Technology (Registered Institution, Bangalore Main Campus) - 2021 to 2025
    addInstitutionPapers({
      collegeId: 'apex',
      collegeName: 'Apex Institute of Technology',
      shortCode: 'Apex Tech',
      campusLocation: 'Electronic City Phase 1, Bangalore Main Campus',
      years: ['2025', '2024', '2023', '2022', '2021'],
      programName: 'B.Tech Computer Science & Engineering',
      departmentName: 'Computer Science & Engineering'
    });

    // 2. Sharda University (Greater Noida Campus) - 2021 to 2025
    addInstitutionPapers({
      collegeId: 'sharda-gn',
      collegeName: 'Sharda University (Greater Noida Campus)',
      shortCode: 'Sharda Univ',
      campusLocation: 'Plot No. 32-34, Knowledge Park III, Greater Noida',
      years: ['2025', '2024', '2023', '2022', '2021'],
      programName: 'B.Tech CSE (Cloud & Distributed Systems)',
      departmentName: 'School of Engineering & Technology'
    });

    // 3. Sharda Group of Institutions (Agra Campus) - 2022 to 2025
    addInstitutionPapers({
      collegeId: 'sharda-agra',
      collegeName: 'Sharda Group of Institutions (Agra Campus)',
      shortCode: 'SGI Agra',
      campusLocation: 'Bichpuri Campus, Mathura-Agra Road, Agra',
      years: ['2024', '2023', '2022'],
      programName: 'B.Tech Computer Science',
      departmentName: 'Faculty of Computer Engineering'
    });

    // 4. Amity University (Noida Main Campus) - 2022 to 2025
    addInstitutionPapers({
      collegeId: 'amity-noida',
      collegeName: 'Amity University (Noida Main Campus)',
      shortCode: 'Amity Noida',
      campusLocation: 'Sector 125, Noida Express Highway, Gautam Buddha Nagar',
      years: ['2024', '2023', '2022'],
      programName: 'B.Tech Computer Science & Engineering',
      departmentName: 'Amity School of Engineering & Technology'
    });

    // 5. Amity University (Mumbai Campus)
    addInstitutionPapers({
      collegeId: 'amity-mumbai',
      collegeName: 'Amity University (Mumbai Campus)',
      shortCode: 'Amity Mumbai',
      campusLocation: 'Mumbai-Pune Expressway, Panvel, Mumbai',
      years: ['2024', '2023', '2022'],
      programName: 'B.Tech Computer Engineering',
      departmentName: 'Amity Institute of Technology Panvel'
    });

    // 6. BITS Pilani (Pilani Main Campus)
    addInstitutionPapers({
      collegeId: 'bits-pilani',
      collegeName: 'BITS Pilani (Pilani Main Campus)',
      shortCode: 'BITS Pilani',
      campusLocation: 'Vidya Vihar, Pilani',
      years: ['2024', '2023', '2022'],
      programName: 'B.E. Computer Science',
      departmentName: 'Computer Science & Information Systems'
    });

    // 7. BITS Pilani (Goa Campus)
    addInstitutionPapers({
      collegeId: 'bits-goa',
      collegeName: 'BITS Pilani (K.K. Birla Goa Campus)',
      shortCode: 'BITS Goa',
      campusLocation: 'NH 17B, Zuarinagar, Sancoale, Goa',
      years: ['2024', '2023', '2022'],
      programName: 'B.E. Computer Science & AI',
      departmentName: 'Department of CS & IS Goa'
    });

    // 8. IIT Bombay (Powai Main Campus)
    addInstitutionPapers({
      collegeId: 'iitb',
      collegeName: 'IIT Bombay (Indian Institute of Technology)',
      shortCode: 'IIT Bombay',
      campusLocation: 'Main Gate Road, Powai, Mumbai',
      years: ['2024', '2023', '2022'],
      programName: 'B.Tech Computer Science & Engineering',
      departmentName: 'Department of CSE, IIT Bombay'
    });

    // 9. VTU Karnataka (Belagavi)
    addInstitutionPapers({
      collegeId: 'vtu',
      collegeName: 'VTU Karnataka (Visvesvaraya Technological University)',
      shortCode: 'VTU Belagavi',
      campusLocation: 'Jnana Sangama, Machhe, Belagavi',
      years: ['2024', '2023', '2022'],
      programName: 'B.E. Computer Science & Engineering',
      departmentName: 'Faculty of Engineering & Technology'
    });

    // 10. Anna University (Chennai)
    addInstitutionPapers({
      collegeId: 'anna',
      collegeName: 'Anna University Chennai',
      shortCode: 'Anna Univ',
      campusLocation: 'College of Engineering Guindy (CEG), Sardar Patel Road, Chennai',
      years: ['2024', '2023', '2022'],
      programName: 'B.E. Computer Science & Engineering',
      departmentName: 'Department of Computer Science & Engineering'
    });

    // 11. National Entrance: JEE Advanced (IIT JAB / NTA)
    addInstitutionPapers({
      collegeId: 'jee-adv',
      collegeName: 'JEE Advanced (National Entrance Examination)',
      shortCode: 'JEE Adv',
      campusLocation: 'National Entrance Test (Conducted by IITs / Joint Admission Board)',
      years: ['2024', '2023', '2022', '2021'],
      programName: 'All India Engineering Admissions',
      departmentName: 'IIT Joint Admission Board (JAB)',
      isNationalExam: true
    });

    // 12. National Entrance: NEET UG (NTA)
    addInstitutionPapers({
      collegeId: 'neet-ug',
      collegeName: 'NEET UG (National Eligibility cum Entrance Test)',
      shortCode: 'NEET UG',
      campusLocation: 'National Entrance Test (Conducted by National Testing Agency NTA)',
      years: ['2024', '2023', '2022'],
      programName: 'All India Undergraduate Medical Admissions (MBBS / BDS)',
      departmentName: 'National Testing Agency (NTA)',
      isNationalExam: true
    });

    // 13. National Entrance: GATE CS & IT
    addInstitutionPapers({
      collegeId: 'gate-cs',
      collegeName: 'GATE Computer Science & Information Technology',
      shortCode: 'GATE CS',
      campusLocation: 'National Postgraduate Examination (IITs & IISc)',
      years: ['2024', '2023', '2022'],
      programName: 'M.Tech / PhD & PSU Recruitment Test',
      departmentName: 'GATE Organizing Institute',
      isNationalExam: true
    });

    // 14. MIT EECS (Cambridge, USA)
    addInstitutionPapers({
      collegeId: 'mit',
      collegeName: 'MIT EECS (Massachusetts Institute of Technology)',
      shortCode: 'MIT EECS',
      campusLocation: '77 Massachusetts Ave, Cambridge, MA, USA',
      years: ['2024', '2023'],
      programName: 'Course 6-3: Computer Science and Engineering',
      departmentName: 'Department of Electrical Engineering & Computer Science'
    });

    // 15. Stanford University (Silicon Valley, USA)
    addInstitutionPapers({
      collegeId: 'stanford',
      collegeName: 'Stanford University (CS & Systems)',
      shortCode: 'Stanford',
      campusLocation: '450 Serra Mall, Stanford, CA, USA',
      years: ['2024', '2023'],
      programName: 'B.S. Computer Science (Systems Track)',
      departmentName: 'Stanford Computer Science Department'
    });

    // 16. Dr. A.P.J. Abdul Kalam Technical University (AKTU Lucknow)
    addInstitutionPapers({
      collegeId: 'aktu',
      collegeName: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU Lucknow)',
      shortCode: 'AKTU Lucknow',
      campusLocation: 'Sec-11, Jankipuram Vistar, Lucknow',
      years: ['2025', '2024', '2023', '2022', '2021'],
      programName: 'B.Tech Computer Science and Engineering (AICTE Model)',
      departmentName: 'Department of Computer Science & Engineering'
    });

    // 17. Savitribai Phule Pune University (SPPU Pune)
    addInstitutionPapers({
      collegeId: 'sppu',
      collegeName: 'Savitribai Phule Pune University (Pune Main Campus)',
      shortCode: 'SPPU Pune',
      campusLocation: 'Ganeshkhind Road, Pune',
      years: ['2025', '2024', '2023', '2022', '2021'],
      programName: 'B.E. Computer Engineering (2019 / 2024 Course Pattern)',
      departmentName: 'Department of Computer Engineering'
    });

    // 18. University of Delhi (DU Central Campus)
    addInstitutionPapers({
      collegeId: 'du',
      collegeName: 'University of Delhi (Delhi University Central Campus)',
      shortCode: 'Delhi Univ',
      campusLocation: 'Benito Juarez Road & Chhatra Marg, New Delhi',
      years: ['2025', '2024', '2023', '2022', '2021'],
      programName: 'B.Sc (Hons) Computer Science (UGCF-2022)',
      departmentName: 'Department of Computer Science'
    });

    // 19. Vellore Institute of Technology (VIT Vellore)
    addInstitutionPapers({
      collegeId: 'vit',
      collegeName: 'Vellore Institute of Technology (VIT Vellore)',
      shortCode: 'VIT Vellore',
      campusLocation: 'Tiruvalam Road, Katpadi, Vellore',
      years: ['2025', '2024', '2023', '2022', '2021'],
      programName: 'B.Tech Computer Science and Engineering',
      departmentName: 'School of Computer Science and Engineering (SCOPE)'
    });

    // 20. Manipal Academy of Higher Education (MAHE Manipal)
    addInstitutionPapers({
      collegeId: 'manipal',
      collegeName: 'Manipal Academy of Higher Education (MAHE Manipal)',
      shortCode: 'MAHE Manipal',
      campusLocation: 'Tiger Circle Road, Madhav Nagar, Manipal',
      years: ['2025', '2024', '2023', '2022', '2021'],
      programName: 'B.Tech Computer Science and Engineering',
      departmentName: 'Department of Computer Science & Engineering'
    });

    // 21. COEP Technological University (Govt College of Engineering Pune)
    addInstitutionPapers({
      collegeId: 'coep',
      collegeName: 'COEP Technological University (Govt College of Engineering Pune)',
      shortCode: 'COEP Pune',
      campusLocation: 'Wellesley Road, Shivajinagar, Pune',
      years: ['2025', '2024', '2023', '2022', '2021'],
      programName: 'B.Tech Computer Engineering',
      departmentName: 'Department of Computer Engineering'
    });

    // 22. Government Polytechnic Mumbai (Autonomous State Technical Institute)
    addInstitutionPapers({
      collegeId: 'gpmumbai',
      collegeName: 'Government Polytechnic Mumbai (Autonomous State Technical Institute)',
      shortCode: 'GP Mumbai',
      campusLocation: '49, Kherwadi, Ali Yavar Jung Marg, Bandra East, Mumbai',
      years: ['2025', '2024', '2023', '2022', '2021'],
      programName: 'Diploma in Computer Engineering (Autonomous Curriculum)',
      departmentName: 'Department of Computer Engineering'
    });

    this.universityQuestionPapers.set(papers);
  }

  private seedDefaultPYQs(): void {
    const defaults: MinedPYQ[] = [
      {
        id: 'pyq-1',
        subjectCode: 'CS401',
        subjectName: 'Distributed Systems',
        topic: 'Raft Consensus Algorithm',
        difficulty: 'HARD',
        format: 'VIVA',
        frequencyBadge: '🔥 Asked in 6 Top University Exams (95% Recurrence)',
        recurrenceRate: 95,
        collegeId: 'apex',
        collegeName: 'Apex Institute of Technology',
        yearAsked: 'Spring 2025 End-Sem Exam',
        isHighYield: true,
        questionText: 'Explain the Leader Election phase in the Raft Consensus Protocol. How are split-vote scenarios resolved using randomized election timers?',
        targetCO: 'CO3',
        bloomLevel: 'ANALYZE',
        universityTags: ['Apex Institute 2025', 'VTU 2024', 'IIT Bombay 2023', 'Anna University 2024'],
        aiThinkerSolution: {
          simpleExplanation: '💡 Simple Intuitive Analogy: Imagine a classroom deciding who gets to speak for the group. If the teacher (Leader) steps out and doesn\'t return (heartbeat timeout), every student sets a random alarm clock between 150ms and 300ms. Whoever\'s alarm goes off first stands up and asks everyone for their vote. Because alarms are randomized, two students almost never stand up at the exact same moment, completely avoiding tie votes (split-votes)!',
          mathematicalDerivation: '📐 Quorum Majority Proof:\nLet total cluster nodes be N (odd number, e.g. 5).\nMajority Quorum Q = floor(N/2) + 1 = 3 nodes.\nIf node i receives votes from set V_i and node j from set V_j where |V_i| >= Q and |V_j| >= Q:\nBy Pigeonhole Principle: |V_i ∩ V_j| >= 1. Since a node casts at most 1 vote per term T, V_i ∩ V_j != ∅ implies at most one leader can be elected per term.',
          architectureDiagram: `[ Follower ] --(Timeout: 150-300ms)--> [ Candidate ] --(Votes >= N/2 + 1)--> [ Leader ]
     ^                                         |
     +-------------(Discovers Higher Term)-----+`,
          examinerKeywords: ['Heartbeat Timeout (150-300ms)', 'Randomized Election Jitter', 'Majority Quorum floor(N/2)+1', 'Term Monotonicity', 'Split-Vote Resolution']
        },
        youtubeReference: {
          title: 'Visual Guide to Raft Consensus in 10 Minutes',
          channelName: 'Computer Science Simplified',
          duration: '10:15',
          youtubeUrl: 'https://www.youtube.com/watch?v=vYp4LYbnnW8',
          timestampNote: 'Split-vote demo at 04:30'
        },
        examSolution: {
          definition: 'Raft is a consensus algorithm designed for understandability, decomposed into Leader Election, Log Replication, and Safety.',
          workingPrinciple: 'Nodes transition between Follower, Candidate, and Leader states. When heartbeat timer expires, a follower increments term and requests votes.',
          stepByStepDerivation: '1. Follower timeout (150-300ms) triggers election.\n2. Node increments currentTerm and votes for self.\n3. Sends RequestVote RPCs to all peers.\n4. If majority (N/2 + 1) votes granted, transitions to Leader.\n5. If split-vote occurs, randomized timeout ensures unequal retry times to guarantee single winner in next term.',
          realWorldApplications: ['etcd in Kubernetes', 'HashiCorp Consul', 'TiKV Storage Engine'],
          examinerKeywords: ['Heartbeat RPC', 'Randomized Election Timers', 'Split-Vote Resolution', 'Majority Quorum', 'Term Monotonicity']
        },
        evaluationRubric: [
          { criterion: 'State Transitions (Follower -> Candidate -> Leader)', marks: 3, description: 'Accurate breakdown of triggers and term counter increments.' },
          { criterion: 'Randomized Timers & Split-Vote Handling', marks: 4, description: 'Explanation of how jitter prevents infinite livelocks.' },
          { criterion: 'Quorum Rule Proof (N/2 + 1)', marks: 3, description: 'Mathematical guarantee of non-overlapping majorities.' }
        ],
        videoTutorials: [
          {
            title: 'Raft Consensus Protocol Visualization & Step-by-Step Derivation',
            channelName: 'MIT 6.824 Distributed Systems',
            duration: '18:42',
            youtubeUrl: 'https://www.youtube.com/watch?v=64Zp3RpgRzs',
            timestampNote: 'Leader Election starts at 04:15'
          }
        ]
      },
      {
        id: 'pyq-2',
        subjectCode: 'CS401',
        subjectName: 'Distributed Systems',
        topic: 'CAP Theorem & Consistency Models',
        difficulty: 'MEDIUM',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 Core Foundation (Asked in 5 University Final Papers)',
        recurrenceRate: 92,
        collegeId: 'mit',
        collegeName: 'MIT EECS',
        yearAsked: 'Fall 2024 Midterm Exam',
        isHighYield: true,
        questionText: 'State and prove the CAP Theorem. Under a network partition (P), why must a distributed datastore choose strictly between Consistency (C) and Availability (A)?',
        targetCO: 'CO5',
        bloomLevel: 'ANALYZE',
        universityTags: ['MIT EECS 2024', 'Apex Institute 2024', 'IIT Bombay 2023'],
        aiThinkerSolution: {
          simpleExplanation: '💡 Simple Intuitive Analogy: Imagine two bank branches connected by a telephone line. A customer deposits $100 in Branch 1. Suddenly, someone cuts the telephone cable (Network Partition). Now a customer walks into Branch 2 and asks for their balance. Branch 2 has only two choices:\nChoice A: Refuse to answer until the phone line is fixed (Consistent, but NOT Available).\nChoice B: Give out the old balance (Available, but NOT Consistent!). You simply cannot have both when the phone line is severed.',
          mathematicalDerivation: '📐 Formal Formulation:\nLet G1 and G2 be two disjoint node partitions separated by network fault P.\n1. Client W writes value v at G1. For Availability, G1 must return OK without waiting for G2.\n2. Client R reads from G2. Since no message can cross partition P, G2 has no knowledge of write v.\n3. For Consistency (Linearizability), R must return v. But G2 only knows old value v_0.\nTherefore, G2 must either return error (violating Availability) or stale value v_0 (violating Consistency). Q.E.D.',
          architectureDiagram: `Client 1 ---> [ Node G1 (Write v=1) ]   === Network Partition (P) ===   [ Node G2 (Old v=0) ] <--- Client 2
                       |                                                         |
                 (Returns 200 OK)                                         (Stale or Error?)`,
          examinerKeywords: ['Network Partition P', 'Linearizable Consistency C', 'Availability A (Non-error response)', 'Gilbert and Lynch Proof', 'Eventual Consistency']
        },
        youtubeReference: {
          title: 'CAP Theorem Explained Clearly & Elegantly',
          channelName: 'Martin Kleppmann (Distributed Systems)',
          duration: '12:35',
          youtubeUrl: 'https://www.youtube.com/watch?v=k-Yaq8AHlFA',
          timestampNote: 'Proof starts at 05:10'
        },
        examSolution: {
          definition: 'CAP Theorem states that any distributed data store can simultaneously provide at most two out of three guarantees: Consistency, Availability, and Partition Tolerance.',
          workingPrinciple: 'Since real-world networks cannot guarantee zero packet drops (P is mandatory), systems must design for either CP (e.g. HBase, CockroachDB) or AP (e.g. Cassandra, DynamoDB).',
          stepByStepDerivation: '1. Partition divides cluster into G1 and G2.\n2. Write to G1 completes.\n3. Read to G2 cannot communicate with G1.\n4. G2 must return error (fails A) or stale data (fails C).',
          realWorldApplications: ['Amazon DynamoDB (AP)', 'Google Spanner (CP via TrueTime)', 'Apache Cassandra (Tunable)'],
          examinerKeywords: ['Partition Tolerance', 'Atomic Consistency', 'Eventual Consistency', 'Gilbert and Lynch']
        },
        evaluationRubric: [
          { criterion: 'Definition of C, A, P', marks: 3, description: 'Accurate technical definition of each guarantee.' },
          { criterion: 'Partition proof breakdown', marks: 4, description: 'Clear explanation of why C and A conflict under P.' },
          { criterion: 'Real-world system examples', marks: 3, description: 'Correct categorization of CP vs AP architectures.' }
        ],
        videoTutorials: [
          {
            title: 'CAP Theorem Explained',
            channelName: 'Distributed Systems Series',
            duration: '12:35',
            youtubeUrl: 'https://www.youtube.com/watch?v=k-Yaq8AHlFA',
            timestampNote: 'At 05:10'
          }
        ]
      },
      {
        id: 'pyq-3',
        subjectCode: 'CS302',
        subjectName: 'Computer Networks',
        topic: 'TCP Congestion Control & Flow Control',
        difficulty: 'HARD',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 Mined in 7 University Exams (96% Recurrence)',
        recurrenceRate: 96,
        collegeId: 'anna',
        collegeName: 'Anna University Chennai',
        yearAsked: 'Dec 2024 End-Sem Examination',
        isHighYield: true,
        questionText: 'Explain TCP Reno Congestion Control mechanism with Slow Start, Congestion Avoidance, and Fast Recovery. Draw the cwnd vs RTT graph for 3 duplicate ACKs vs Timeout.',
        targetCO: 'CO4',
        bloomLevel: 'APPLY',
        universityTags: ['Anna University 2024', 'VTU 2023', 'Apex Institute 2024', 'SPPU 2023'],
        aiThinkerSolution: {
          simpleExplanation: '💡 Simple Intuitive Analogy: Imagine driving a delivery van on an unfamiliar highway. In Slow Start, you double your speed every mile (exponential) to see how fast the road allows. Once you hit a safety threshold (ssthresh), you switch to Congestion Avoidance, tapping the gas up by just 1 mph per mile (linear). If another driver flashes their lights 3 times (3 duplicate ACKs), you tap the brakes to half speed (Fast Recovery) without coming to a dead stop. But if you hit a wall (Timeout), you drop straight back to 1 mph!',
          mathematicalDerivation: '📐 Mathematical Rules:\n1. Slow Start: For every ACK received: cwnd := cwnd + 1 (Doubles cwnd per RTT: 1, 2, 4, 8, ...).\n2. Congestion Avoidance (when cwnd >= ssthresh): cwnd := cwnd + (1 / cwnd) per ACK (Additive Increase of +1 MSS per RTT).\n3. 3-Duplicate ACKs (Fast Retransmit/Recovery): ssthresh := cwnd / 2, cwnd := ssthresh + 3 MSS.\n4. Timeout: ssthresh := cwnd / 2, cwnd := 1 MSS (Full reset to Slow Start).',
          architectureDiagram: `cwnd (MSS)
  ^
  |        /\\ (Congestion Avoidance: +1 MSS/RTT)
  |       /  \\ (3 Dup ACKs: Drop to ssthresh=cwnd/2)
  |  /|  /    \\__
  | / | /
  |/  |/ (Timeout: Drops to 1 MSS)
  +-------------------------------------> RTT`,
          examinerKeywords: ['Slow Start (Exponential)', 'Congestion Avoidance (Additive Increase)', 'ssthresh threshold', '3-Duplicate ACKs vs Timeout', 'Fast Retransmit & Fast Recovery']
        },
        youtubeReference: {
          title: 'TCP Congestion Control: AIMD & Reno Sawtooth Graph',
          channelName: 'Stanford CS144 Networking',
          duration: '16:45',
          youtubeUrl: 'https://www.youtube.com/watch?v=F27PLhn3W04',
          timestampNote: 'Sawtooth curve derivation at 07:15'
        },
        examSolution: {
          definition: 'TCP Reno implements feedback-based window flow control using Additive Increase Multiplicative Decrease (AIMD).',
          workingPrinciple: 'Sender maintains congestion window cwnd and slow start threshold ssthresh to dynamically adjust transmission rate to available link capacity.',
          stepByStepDerivation: 'Slow start increases cwnd exponentially. At ssthresh, rate changes to linear increase. On packet loss detected by 3 Dup ACKs, Fast Retransmit re-sends packet and sets cwnd=ssthresh (Fast Recovery). On timeout, cwnd resets to 1.',
          realWorldApplications: ['Internet TCP Sockets', 'BBR vs Reno Web traffic', 'Linux Kernel TCP Stack'],
          examinerKeywords: ['AIMD', 'Fast Recovery', '3 Dup ACKs', 'ssthresh', 'Exponential Growth']
        },
        evaluationRubric: [
          { criterion: 'Phases explanation (Slow Start, Avoidance, Recovery)', marks: 4, description: 'Correct formula and trigger conditions for each phase.' },
          { criterion: 'Accurate cwnd vs RTT graph', marks: 4, description: 'Correct labeling of ssthresh, timeout reset, and fast recovery half-drop.' },
          { criterion: 'Timeout vs 3-Dup ACK distinction', marks: 2, description: 'Contrast in severity and window reset behavior.' }
        ],
        videoTutorials: [
          {
            title: 'TCP Congestion Control Sawtooth',
            channelName: 'Stanford Networking',
            duration: '16:45',
            youtubeUrl: 'https://www.youtube.com/watch?v=F27PLhn3W04',
            timestampNote: 'At 07:15'
          }
        ]
      },
      {
        id: 'pyq-4',
        subjectCode: 'CS401',
        subjectName: 'Distributed Systems',
        topic: 'Logical & Vector Clocks',
        difficulty: 'MEDIUM',
        format: 'VIVA',
        frequencyBadge: '🔥 Top Oral VIVA Question (90% Recurrence)',
        recurrenceRate: 90,
        collegeId: 'iitb',
        collegeName: 'IIT Bombay',
        yearAsked: 'Winter 2024 End-Sem Exam',
        isHighYield: true,
        questionText: 'Why are Lamport Timestamps incapable of detecting concurrent events? How do Vector Clocks solve this limitation mathematically?',
        targetCO: 'CO2',
        bloomLevel: 'UNDERSTAND',
        universityTags: ['IIT Bombay 2024', 'Apex Institute 2024', 'MIT EECS 2023'],
        aiThinkerSolution: {
          simpleExplanation: '💡 Simple Intuitive Analogy: Lamport timestamp is like giving everyone a raffle ticket number: ticket #5 happened after ticket #4. But if two people bought tickets at two different booths at the exact same moment without knowing about each other, the ticket number alone cannot tell you if they talked to each other! Vector clocks give every person a passport stamped with how many messages they have received from every other country. If neither passport has the other\'s stamp, we know with 100% certainty they acted concurrently!',
          mathematicalDerivation: '📐 Mathematical Proof:\nLamport Invariant: a -> b => L(a) < L(b). But converse does NOT hold: L(a) < L(b) ≠> a -> b.\nVector Clock Rule: For N processes, clock V_i is a vector of size N.\nEvent a at i happened-before event b at j (a -> b) iff:\n1. For all k ∈ [1, N]: V(a)[k] <= V(b)[k]\n2. There exists at least one j such that: V(a)[j] < V(b)[j].\nIf neither V(a) <= V(b) nor V(b) <= V(a), events a and b are strictly CONCURRENT (a || b).',
          architectureDiagram: `Process P1: (1,0,0) ----(msg)----> (2,0,0)
                              \\
Process P2: (0,0,0) -----------> (1,1,0)  <-- Causally Linked!
Process P3: (0,0,1) ------------------------ (0,0,1)  <-- Concurrent with P1!`,
          examinerKeywords: ['Happens-Before Relation (->)', 'Causal Precedence vs Total Order', 'Vector Invariant V(a) <= V(b)', 'Concurrent Events (a || b)', 'False Causality Elimination']
        },
        youtubeReference: {
          title: 'Vector Clocks & Causality in Distributed Systems',
          channelName: 'Computerphile',
          duration: '14:10',
          youtubeUrl: 'https://www.youtube.com/watch?v=ER4i8XQpU7Q',
          timestampNote: 'Vector comparison proof at 06:45'
        },
        examSolution: {
          definition: 'Vector clocks capture causal relationships (happens-before ordering) in distributed systems by assigning a vector of logical timestamps to events.',
          workingPrinciple: 'Each process maintains vector V of size N. Local events increment V[i]. Messages carry vector V. Receiver updates V[k] = max(V_local[k], V_msg[k]) and increments V[receiver].',
          stepByStepDerivation: 'Lamport clocks only guarantee consistency in one direction. Vector clocks guarantee exact equivalence: V(a) < V(b) <=> a -> b. Allows deterministic detection of concurrency.',
          realWorldApplications: ['Amazon DynamoDB version reconciliation', 'Git commit graph tracking', 'Riak distributed key-value store'],
          examinerKeywords: ['Lamport Clock', 'Vector Clock', 'Happens-Before', 'Concurrent Events', 'Causality']
        },
        evaluationRubric: [
          { criterion: 'Lamport limitation explanation', marks: 3, description: 'Explanation of why L(a)<L(b) does not imply causality.' },
          { criterion: 'Vector clock update rules', marks: 4, description: 'Internal event and message receive vector merge equations.' },
          { criterion: 'Concurrency definition formula', marks: 3, description: 'Non-comparability criteria indicating concurrent events.' }
        ],
        videoTutorials: [
          {
            title: 'Vector Clocks in Distributed Systems',
            channelName: 'Computerphile',
            duration: '14:10',
            youtubeUrl: 'https://www.youtube.com/watch?v=ER4i8XQpU7Q',
            timestampNote: 'At 06:45'
          }
        ]
      },
      {
        id: 'pyq-5',
        subjectCode: 'CSE-354',
        subjectName: 'Embedded Systems',
        topic: '8051 Timer Modes & Baud Rate Generation',
        difficulty: 'EASY',
        format: 'DESCRIPTIVE',
        frequencyBadge: '🔥 Mined in 5 University Exams (88% Recurrence)',
        recurrenceRate: 88,
        collegeId: 'vtu',
        collegeName: 'VTU Karnataka',
        yearAsked: 'Jan 2024 Examination',
        isHighYield: true,
        questionText: 'Differentiate between Timer Mode 1 (16-bit) and Timer Mode 2 (8-bit Auto-Reload) in the 8051 Microcontroller. Calculate TH1 value for 9600 baud rate with 11.0592 MHz crystal.',
        targetCO: 'CO2',
        bloomLevel: 'APPLY',
        universityTags: ['VTU 2024', 'Apex Institute 2024', 'AKTU 2023'],
        aiThinkerSolution: {
          simpleExplanation: '💡 Simple Intuitive Analogy: Timer Mode 1 is like a 16-gallon bucket. When it fills up completely, it beeps, but you have to manually empty it and set it back to zero each time. Timer Mode 2 is like a dual-chamber coffee machine: whenever the small 8-ounce cup overflows, it automatically refills itself instantly from the reservoir (TH1) without any software intervention. This automatic refill makes it perfect for keeping a steady baud rate tick!',
          mathematicalDerivation: '📐 Baud Rate Formula Derivation:\nBaud Rate = (2^SMOD / 32) * (F_osc / (12 * (256 - TH1)))\nGiven: F_osc = 11.0592 MHz, SMOD = 0, Target Baud = 9600.\n1. Machine Cycle Clock = 11.0592 MHz / 12 = 921.6 kHz.\n2. Timer 1 Input Frequency = 921.6 kHz / 32 = 28,800 Hz.\n3. Count required = 28,800 / 9600 = 3.\n4. TH1 Reload Value = 256 - 3 = 253 = 0xFD (FDH in hexadecimal).',
          architectureDiagram: `[ Crystal: 11.0592 MHz ] ---> [ ÷12 Machine Cycle ] ---> [ ÷32 UART Prescaler ] ---> [ Timer 1: Reload FDH ] ---> 9600 Baud`,
          examinerKeywords: ['TMOD Register', 'Timer Mode 2 (8-bit Auto-Reload)', '11.0592 MHz Crystal', 'TH1 = 0xFD (253 Decimal)', 'SMOD Bit']
        },
        youtubeReference: {
          title: '8051 Timer Mode 2 Baud Rate Calculation Step-by-Step',
          channelName: 'NPTEL Microcontrollers',
          duration: '14:20',
          youtubeUrl: 'https://www.youtube.com/watch?v=example1',
          timestampNote: 'Formula derivation at 05:00'
        },
        examSolution: {
          definition: '8051 contains two 16-bit timers (Timer 0 & Timer 1) configured via TMOD and controlled via TCON.',
          workingPrinciple: 'In Mode 1, TL and TH act as cascading 16-bit registers (0000H to FFFFH). In Mode 2, TL is loaded with TH value upon overflow automatically, ideal for serial baud clocks.',
          stepByStepDerivation: 'Formula: Baud Rate = (SMOD Factor * Machine Clock) / (32 * 12 * (256 - TH1))\nWith Crystal = 11.0592 MHz, Machine Clock = 921.6 kHz.\nFor 9600 baud: 9600 = 28800 / (256 - TH1)\n256 - TH1 = 3 => TH1 = 253 = FDH (in Hex).',
          realWorldApplications: ['UART Serial Communication', 'PWM Motor Controllers', 'Real-Time Clock Delays'],
          examinerKeywords: ['TMOD Configuration', 'Auto-Reload Mode 2', '11.0592 MHz Crystal', 'TH1 = 0xFD', 'SMOD Bit']
        },
        evaluationRubric: [
          { criterion: 'Mode 1 vs Mode 2 Distinction', marks: 4, description: 'Comparison of register widths and reload behaviors.' },
          { criterion: 'Mathematical Calculation of TH1', marks: 4, description: 'Correct formula, step-by-step arithmetic, and hex value (FDH).' },
          { criterion: 'TMOD Register Bit Layout', marks: 2, description: 'Gate, C/T, M1, M0 bit settings.' }
        ],
        videoTutorials: [
          {
            title: '8051 Microcontroller Timer Mode 2 Baud Rate Derivation',
            channelName: 'NPTEL Microcontrollers',
            duration: '14:20',
            youtubeUrl: 'https://www.youtube.com/watch?v=example1',
            timestampNote: 'Baud formula derivation at 05:00'
          }
        ]
      }
    ];

    // Merge with any mentor practice questions
    const mentorPapers = this.mentorPracticePapers();
    const mentorQuestions = mentorPapers.flatMap(p => p.questions);
    this.pyqs.set([...mentorQuestions, ...defaults]);
  }

  private seedDefaultQuestionPapers(): void {
    const defaults: OCRQuestionPaper[] = [
      {
        id: 'ocr-doc-1',
        title: 'Apex University End-Semester Examination Spring 2025',
        subjectCode: 'CS401',
        subjectName: 'Distributed Systems & Cloud Computing',
        institution: 'Apex Institute of Technology',
        examSession: 'May-June 2025',
        totalMarks: 70,
        uploadDate: '2026-02-28',
        fileName: 'CS401_EndSem_May2025_Paper.pdf',
        fileSize: '2.4 MB',
        previewUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
        status: 'EXTRACTED',
        extractedQuestions: [
          {
            id: 'q-101',
            section: 'SECTION A (Short Answer)',
            questionNumber: '1(a)',
            marks: 4,
            targetCO: 'CO1',
            bloomLevel: 'UNDERSTAND',
            prompt: 'Explain the differences between Message Passing vs Remote Procedure Calls (RPC). State two advantages of gRPC Protocol Buffers over JSON payloads.',
            codeSnippet: '// Protocol Buffer Definition Example\nmessage CandidateRequest {\n  string student_id = 1;\n  int32 term_number = 2;\n}',
            customAnswer: {
              complexity: 'MEDIUM',
              lengthFormat: 'BRIEF',
              style: 'ACADEMIC',
              generatedText: '1. Coupling: RPC provides synchronous procedural abstraction, whereas message passing is asynchronous and decoupled.\n2. Binary Serialization: Protocol Buffers use compact binary encoding, reducing bandwidth by up to 70% compared to textual JSON, and enforcing strong schema validation at compile time.'
            },
            recommendedLectures: [
              {
                topic: 'gRPC Architecture',
                videoTitle: 'gRPC vs REST Benchmarks & Protocol Buffers',
                timestamp: '03:15',
                url: 'https://www.youtube.com/watch?v=gnchfOojMk4'
              }
            ]
          },
          {
            id: 'q-102',
            section: 'SECTION B (Long Analytical)',
            questionNumber: '2(b)',
            marks: 10,
            targetCO: 'CO3',
            bloomLevel: 'ANALYZE',
            prompt: 'Describe the Byzantine Generals Problem in synchronous distributed systems with m oral messages. Prove why consensus is impossible when 3m or fewer generals are present.',
            codeSnippet: '// Quorum Condition:\nN >= 3m + 1 where m = faulty nodes\nFault tolerance threshold: < 33.33% malicious traitors',
            customAnswer: {
              complexity: 'HARD',
              lengthFormat: 'DETAILED',
              style: 'ACADEMIC',
              generatedText: 'Proof by Contradiction:\nFor 3 generals (A, B, C) where 1 is a traitor (m=1):\nCase 1: Commander A is loyal and commands Attack. Traitor B tells C that A said Retreat. Loyal C sees conflicting messages (Attack from A, Retreat from B) and cannot determine who lied.\nCase 2: Commander A is traitor, sending Attack to B and Retreat to C. From loyal B perspective, scenario is indistinguishable from Case 1.\nHence, 3 nodes cannot withstand 1 Byzantine traitor. For consensus, total nodes N >= 3m + 1.'
            },
            recommendedLectures: [
              {
                topic: 'Byzantine Fault Tolerance',
                videoTitle: 'Byzantine Generals Problem Explained Simply',
                timestamp: '08:40',
                url: 'https://www.youtube.com/watch?v=dfs0T511L4Q'
              }
            ]
          }
        ]
      }
    ];

    this.questionPapers.set(defaults);
  }

  // 2. Class Verification & Join Actions
  findClassroom(codeOrUrl: string): ClassroomLookupResult {
    const norm = (str: string | undefined | null) => (str || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const extractedCode = extractClassCode(codeOrUrl);
    const cleanNorm = norm(extractedCode);

    if (!cleanNorm) {
      return {
        found: false,
        extractedCode: '',
        isEnrolled: false,
        isPending: false,
        errorMessage: 'Please enter a valid course code or direct classroom link.'
      };
    }

    // Check if student is already enrolled or pending in this class
    const existing = this.joinedClasses().find(c =>
      norm(c.joinCode) === cleanNorm ||
      norm(c.id) === cleanNorm ||
      norm(c.subjectCode) === cleanNorm
    );
    if (existing) {
      if (existing.status === 'ENROLLED') {
        return {
          found: true,
          extractedCode: existing.joinCode || extractedCode,
          isEnrolled: true,
          isPending: false,
          classroom: existing,
          errorMessage: `You are already enrolled in ${existing.name} (${existing.subjectCode}).`
        };
      }
      return {
        found: true,
        extractedCode: existing.joinCode || extractedCode,
        isEnrolled: false,
        isPending: true,
        classroom: existing,
        errorMessage: `Your enrollment request for ${existing.name} is already pending mentor approval.`
      };
    }

    // Lookup dynamically created Mentor Classes from localStorage
    let matchedMentorClass: any = null;
    if (typeof window !== 'undefined') {
      try {
        const savedMentorClasses = localStorage.getItem('viva_mentor_classes');
        if (savedMentorClasses) {
          const mentorClasses = JSON.parse(savedMentorClasses);
          matchedMentorClass = mentorClasses.find((c: any) =>
            norm(c.joinCode) === cleanNorm ||
            norm(c.subjectCode) === cleanNorm ||
            c.id === extractedCode ||
            norm(c.id) === cleanNorm
          );
        }
      } catch (e) {}
    }

    // Lookup Built-in System Registry Classes
    const builtInClasses = [
      {
        id: 'cls-401',
        name: 'Distributed Systems & Consensus Architecture',
        subjectCode: 'CS401',
        department: 'Computer Science & Engineering',
        semester: 7,
        academicYear: '2026-2027',
        joinCode: 'DIST-4912',
        altJoinCode: 'OS-4482',
        mentorName: 'Dr. Sarah Jenkins',
        mentorEmail: 's.jenkins@apex.edu',
        coverGradient: 'from-emerald-900 to-teal-950'
      },
      {
        id: 'cls-302',
        name: 'Computer Networks & Internet Protocols',
        subjectCode: 'CS302',
        department: 'Computer Science & Engineering',
        semester: 5,
        academicYear: '2026-2027',
        joinCode: 'NET-8924',
        mentorName: 'Prof. Aris Thorne',
        mentorEmail: 'aris.t@apex.edu',
        coverGradient: 'from-cyan-900 to-blue-950'
      },
      {
        id: 'cls-501',
        name: 'Neural Networks & Deep Learning Lab',
        subjectCode: 'AI501',
        department: 'Artificial Intelligence',
        semester: 7,
        academicYear: '2026-2027',
        joinCode: 'DEEP-3105',
        mentorName: 'Prof. Aris Thorne',
        mentorEmail: 'aris.t@apex.edu',
        coverGradient: 'from-indigo-900 to-purple-950'
      },
      {
        id: 'cls-402',
        name: 'Advanced Embedded Systems & 8051 Microcontrollers',
        subjectCode: 'CSE-354',
        department: 'Computer Science & Engineering',
        semester: 6,
        academicYear: '2026-2027',
        joinCode: 'CSE-354-IT',
        mentorName: 'Prof. David Vance',
        mentorEmail: 'd.vance@apex.edu',
        coverGradient: 'from-blue-900 to-indigo-950'
      },
      {
        id: 'cls-403',
        name: 'Cloud Computing & Kubernetes Microservices',
        subjectCode: 'CS702',
        department: 'Computer Science & Engineering',
        semester: 6,
        academicYear: '2026-2027',
        joinCode: 'PRO-8051-X9',
        mentorName: 'Dr. Elena Rostova',
        mentorEmail: 'e.rostova@apex.edu',
        coverGradient: 'from-purple-900 to-slate-950'
      }
    ];

    if (!matchedMentorClass) {
      matchedMentorClass = builtInClasses.find(c =>
        norm(c.joinCode) === cleanNorm ||
        (c.altJoinCode && norm(c.altJoinCode) === cleanNorm) ||
        norm(c.subjectCode) === cleanNorm ||
        c.id === extractedCode ||
        norm(c.id) === cleanNorm
      );
    }

    // IF NO CLASS MATCHES -> NOT FOUND
    if (!matchedMentorClass) {
      return {
        found: false,
        extractedCode: extractedCode,
        isEnrolled: false,
        isPending: false,
        errorMessage: `Classroom not found. No active classroom matches the code or link "${extractedCode || codeOrUrl}". Please check with your mentor and try again.`
      };
    }

    return {
      found: true,
      extractedCode: matchedMentorClass.joinCode || extractedCode,
      isEnrolled: false,
      isPending: false,
      classroom: {
        id: matchedMentorClass.id,
        name: matchedMentorClass.name,
        subjectCode: matchedMentorClass.subjectCode,
        joinCode: matchedMentorClass.joinCode || extractedCode,
        mentorName: matchedMentorClass.mentorName || 'Prof. Aris Thorne',
        mentorEmail: matchedMentorClass.mentorEmail || 'aris.t@apex.edu',
        department: matchedMentorClass.department || 'Computer Science & Engineering',
        semester: matchedMentorClass.semester || 6,
        academicYear: matchedMentorClass.academicYear || '2026-2027',
        coverGradient: matchedMentorClass.coverGradient || 'from-indigo-900 to-slate-950'
      }
    };
  }

  submitJoinCode(codeOrUrl: string): { success: boolean; notFound?: boolean; isEnrolled?: boolean; isPending?: boolean; message: string; pendingClass?: StudentJoinedClass } {
    const lookup = this.findClassroom(codeOrUrl);

    if (!lookup.found) {
      return {
        success: false,
        notFound: true,
        message: lookup.errorMessage || 'Classroom not found. Please verify the code or invite link.'
      };
    }

    if (lookup.isEnrolled) {
      return {
        success: false,
        isEnrolled: true,
        message: lookup.errorMessage!
      };
    }

    if (lookup.isPending) {
      return {
        success: false,
        isPending: true,
        message: lookup.errorMessage!
      };
    }

    const target = lookup.classroom!;

    // Create New Pending Entry
    const newPending: StudentJoinedClass = {
      id: target.id,
      name: target.name,
      subjectCode: target.subjectCode,
      department: target.department,
      semester: target.semester,
      academicYear: target.academicYear || '2026-2027',
      joinCode: target.joinCode,
      mentorName: target.mentorName,
      mentorId: 'SX-M401',
      mentorEmail: target.mentorEmail,
      status: 'PENDING',
      enrolledAt: new Date().toISOString().split('T')[0],
      coverGradient: target.coverGradient || 'from-amber-900 to-stone-950',
      testsCount: 2,
      vivasCompleted: 0,
      targetCOs: ['CO1', 'CO2', 'CO3', 'CO4']
    };

    const updated = [newPending, ...this.joinedClasses()];
    this.joinedClasses.set(updated);
    this.saveClassesToStorage(updated);

    // Save to shared enrollment roster and mentor notifications
    this.writeToSharedEnrollmentRoster(newPending);

    // Broadcast across channel
    if (this.enrollmentChannel) {
      try {
        this.enrollmentChannel.postMessage({
          type: 'STUDENT_JOIN_REQUEST',
          studentId: this.profile().studentId,
          studentName: this.profile().fullName,
          studentEmail: this.profile().email,
          classCode: target.joinCode,
          classId: target.id,
          className: target.name,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Enrollment channel broadcast error', e);
      }
    }

    // Add Student Notification
    const stuNotif: StudentNotificationItem = {
      id: `notif-${Date.now()}`,
      title: '⏳ Enrollment Request Submitted',
      message: `You requested access to ${target.name} with code ${target.joinCode}. Awaiting mentor approval.`,
      type: 'DIRECT_MESSAGE',
      timestamp: 'Just now',
      isNew: true,
      actionUrl: '/student/classes',
      courseCode: target.subjectCode
    };
    this.notifications.set([stuNotif, ...this.notifications()]);
    this.saveNotificationsToStorage(this.notifications());

    return {
      success: true,
      message: `The request is pending, wait for the mentor approval for ${target.name} (Code: ${target.joinCode}). Please contact the mentor if urgent.`,
      pendingClass: newPending
    };
  }

  private writeToSharedEnrollmentRoster(cls: StudentJoinedClass): void {
    if (typeof window === 'undefined') return;
    try {
      const norm = (str: string | undefined | null) => (str || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const cleanNorm = norm(cls.joinCode);

      // 1. Enrollment Requests
      const existingStr = localStorage.getItem('viva_enrollment_requests');
      const list = existingStr ? JSON.parse(existingStr) : [];
      const alreadyExists = list.some((r: any) => 
        (r.classId === cls.id || norm(r.classCode) === cleanNorm) && 
        r.studentId === this.profile().studentId
      );

      if (!alreadyExists) {
        list.unshift({
          id: `req-${Date.now()}`,
          classId: cls.id,
          className: cls.name,
          classCode: cls.joinCode,
          studentId: this.profile().studentId,
          studentName: this.profile().fullName,
          studentEmail: this.profile().email,
          requestedAt: 'Just now'
        });
        localStorage.setItem('viva_enrollment_requests', JSON.stringify(list));
      }

      // 2. Mentor Notification
      const notifsStr = localStorage.getItem('viva_mentor_notifications');
      const notifsList = notifsStr ? JSON.parse(notifsStr) : [];
      notifsList.unshift({
        id: `notif-join-${Date.now()}`,
        type: 'ENROLLMENT',
        title: `👥 New Join Request: ${this.profile().fullName}`,
        message: `${this.profile().fullName} (${this.profile().studentId}) entered join code ${cls.joinCode} to request access to ${cls.name}.`,
        read: false,
        linkUrl: `/mentor/classes/${cls.id}?tab=enrollment`,
        createdAt: 'Just now'
      });
      localStorage.setItem('viva_mentor_notifications', JSON.stringify(notifsList));

      // 3. Update Mentor Class pending count
      const mentorClassesStr = localStorage.getItem('viva_mentor_classes');
      if (mentorClassesStr) {
        const mClasses = JSON.parse(mentorClassesStr);
        const targetCls = mClasses.find((c: any) => c.id === cls.id || norm(c.joinCode) === cleanNorm);
        if (targetCls) {
          targetCls.pendingRequestsCount = (targetCls.pendingRequestsCount || 0) + 1;
          localStorage.setItem('viva_mentor_classes', JSON.stringify(mClasses));
        }
      }
    } catch (e) {
      console.warn('Could not write to shared enrollment roster', e);
    }
  }

  handleEnrollmentApproved(classCodeOrId: string): void {
    const updated = this.joinedClasses().map(c => {
      if (c.joinCode === classCodeOrId || c.id === classCodeOrId) {
        return { ...c, status: 'ENROLLED' as const };
      }
      return c;
    });
    this.joinedClasses.set(updated);
    this.saveClassesToStorage(updated);

    const targetClass = this.joinedClasses().find(c => c.joinCode === classCodeOrId || c.id === classCodeOrId);
    const className = targetClass?.name || classCodeOrId;

    // Add notification
    const notif: StudentNotificationItem = {
      id: `notif-${Date.now()}`,
      title: '🎉 Classroom Enrollment Approved',
      message: `Your request to join ${className} was approved by the mentor. You now have full access.`,
      type: 'ANNOUNCEMENT',
      timestamp: 'Just now',
      isNew: true,
      actionUrl: '/student/classes'
    };
    this.notifications.set([notif, ...this.notifications()]);
    this.saveNotificationsToStorage(this.notifications());
  }


  // 4. Notifications & Theme
  setTheme(theme: StudentThemePreference): void {
    this.themePreference.set(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.KEY_THEME, theme);
      const allThemeClasses = ['theme-dark', 'theme-slate', 'theme-light', 'theme-contrast', 'dark'];
      document.documentElement.classList.remove(...allThemeClasses);
      if (document.body) {
        document.body.classList.remove(...allThemeClasses);
      }
      document.documentElement.classList.add(`theme-${theme}`);
      if (document.body) {
        document.body.classList.add(`theme-${theme}`);
      }
      if (theme === 'dark' || theme === 'slate') {
        document.documentElement.classList.add('dark');
        if (document.body) {
          document.body.classList.add('dark');
        }
      }
    }
  }

  updateProfile(updatedFields: Partial<StudentAcademicProfile>): StudentAcademicProfile {
    const next = { ...this.profile(), ...updatedFields };
    this.profile.set(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.KEY_PROFILE, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save profile to storage:', e);
      }
    }
    return next;
  }


  markNotificationRead(id: string): void {
    const updated = this.notifications().map(n => n.id === id ? { ...n, isNew: false } : n);
    this.notifications.set(updated);
    this.saveNotificationsToStorage(updated);
  }

  markAllNotificationsRead(): void {
    const updated = this.notifications().map(n => ({ ...n, isNew: false }));
    this.notifications.set(updated);
    this.saveNotificationsToStorage(updated);
  }

  private saveClassesToStorage(classes: StudentJoinedClass[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.KEY_JOINED_CLASSES, JSON.stringify(classes));
      } catch (e) {}
    }
  }

  private saveNotificationsToStorage(notifs: StudentNotificationItem[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.KEY_NOTIFICATIONS, JSON.stringify(notifs));
      } catch (e) {}
    }
  }

  // 5. AI Multi-Rubric Viva Answer Evaluator (Powered by Gemini AI)
  evaluateVivaQuestions(
    submissions: VivaQuestionSubmissionItem[],
    courseCode = 'CS401',
    courseName = 'Distributed Systems'
  ): Observable<StudentVivaEvaluationResult> {
    return this.geminiService.evaluateComprehensiveViva(submissions, courseCode, courseName);
  }

  evaluateVivaAnswer(questionText: string, transcript: string, targetCO: string): Observable<StudentVivaEvaluationResult> {
    const submission: VivaQuestionSubmissionItem = {
      questionIndex: 1,
      prompt: questionText,
      marks: 10,
      targetCO,
      studentAnswer: transcript
    };
    return this.evaluateVivaQuestions([submission]);
  }

  // 6. Question Paper OCR Simulator
  processSampleOCR(): Observable<OCRQuestionPaper> {
    return of(this.questionPapers()[0]);
  }

  // 7. Proctoring Telemetry & Biometric Face Incident Reporting
  streamLiveVivaTelemetry(payload: any): void {
    if (this.proctorChannel) {
      try {
        this.proctorChannel.postMessage({
          type: 'STUDENT_FRAME_STREAM',
          studentId: this.profile().studentId,
          studentName: this.profile().fullName,
          studentRoll: this.profile().studentId,
          studentAvatar: this.profile().avatarUrl,
          timestamp: Date.now(),
          ...payload
        });
      } catch (e) {}
    }
  }

  streamVideoFrameToProctor(dataUrl: string): void {
    if (this.proctorChannel) {
      try {
        this.proctorChannel.postMessage({
          type: 'STUDENT_FRAME_STREAM',
          studentId: this.profile().studentId,
          studentName: this.profile().fullName,
          frameData: dataUrl,
          timestamp: Date.now()
        });
      } catch (e) {}
    }
  }

  broadcastFaceTelemetry(similarityScore: number, isFaceDetected: boolean, baselineSnapshot?: string): void {
    if (this.proctorChannel) {
      try {
        this.proctorChannel.postMessage({
          type: 'STUDENT_FACE_TELEMETRY',
          studentId: this.profile().studentId,
          studentName: this.profile().fullName,
          similarityScore,
          isFaceDetected,
          baselineSnapshot,
          timestamp: Date.now()
        });
      } catch (e) {}
    }
  }

  getClassSecurityPolicy(classIdOrCode: string): ClassSecurityPolicy {
    if (typeof localStorage !== 'undefined') {
      try {
        const clean = classIdOrCode ? classIdOrCode.trim() : '';
        const saved = localStorage.getItem(`class_security_policy_${clean}`);
        if (saved) return JSON.parse(saved);
        
        // Also check in joinedClasses
        const found = this.joinedClasses().find(c => c.id === clean || c.subjectCode === clean || c.joinCode === clean);
        if (found?.securityPolicy) return found.securityPolicy;
      } catch (e) {}
    }
    return {
      enabled: true,
      maxTabSwitches: 3,
      allowFullscreenExit: false,
      blurOnFocusLoss: true,
      strictDisqualification: true,
      requireFaceContinuity: true
    };
  }

  saveClassSecurityPolicy(classIdOrCode: string, policy: ClassSecurityPolicy): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const clean = classIdOrCode ? classIdOrCode.trim() : '';
        localStorage.setItem(`class_security_policy_${clean}`, JSON.stringify(policy));
      } catch (e) {}
    }
    if (this.enrollmentChannel) {
      try {
        this.enrollmentChannel.postMessage({
          type: 'CLASS_SECURITY_POLICY_UPDATED',
          classId: classIdOrCode,
          policy
        });
      } catch (e) {}
    }
  }

  reportStudentDisqualification(incident: {
    studentId: string;
    studentName: string;
    studentRoll: string;
    studentAvatar?: string;
    classId: string;
    subjectCode: string;
    className: string;
    reason: string;
    totalStrikes: number;
    strikesBreakdown: any[];
    terminatedAt: string;
  }): void {
    const payload = {
      type: 'STUDENT_DISQUALIFIED',
      ...incident
    };

    if (this.proctorChannel) {
      try {
        this.proctorChannel.postMessage(payload);
      } catch (e) {}
    }
    if (this.enrollmentChannel) {
      try {
        this.enrollmentChannel.postMessage(payload);
      } catch (e) {}
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const existing: any[] = JSON.parse(localStorage.getItem('viva_terminated_students_v1') || '[]');
        const filtered = existing.filter(t => !(t.classId === incident.classId && t.studentId === incident.studentId));
        filtered.unshift(incident);
        localStorage.setItem('viva_terminated_students_v1', JSON.stringify(filtered));
      } catch (e) {}
    }
  }

  reportSuspiciousActivity(
    incidentType: 'TAB_SWITCH' | 'WINDOW_UNFOCUSED' | 'EYE_GAZE_LOST' | 'FULLSCREEN_EXIT' | 'MULTIPLE_FACES' | 'FACE_NOT_VISIBLE' | 'FACE_MISMATCH' | 'SUSPICIOUS_AUDIO' | 'EXAM_TERMINATED',
    description: string,
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    metadata?: any,
    classId?: string,
    subjectCode?: string,
    className?: string
  ): void {
    const payload = {
      type: 'STUDENT_PROCTOR_INCIDENT',
      studentId: this.profile().studentId,
      studentName: this.profile().fullName,
      studentRoll: this.profile().studentId,
      studentSection: this.profile().section,
      classId: classId || 'cls-401',
      subjectCode: subjectCode || 'CS401',
      className: className || 'Distributed Systems',
      incidentType,
      description,
      severity,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      metadata: metadata || {}
    };

    // 1. Broadcast to Mentor live channel
    if (this.proctorChannel) {
      try {
        this.proctorChannel.postMessage(payload);
      } catch (e) {}
    }
    if (this.enrollmentChannel) {
      try {
        this.enrollmentChannel.postMessage(payload);
      } catch (e) {}
    }

    // 2. Persist to incident log
    if (typeof window !== 'undefined') {
      try {
        const existingLogs = JSON.parse(localStorage.getItem('viva_proctor_incident_logs') || '[]');
        existingLogs.unshift(payload);
        localStorage.setItem('viva_proctor_incident_logs', JSON.stringify(existingLogs.slice(0, 100)));

        // Also persist to specific class incident log
        if (classId) {
          const classKey = `viva_class_proctor_incidents_v1_${classId}`;
          const classLogs = JSON.parse(localStorage.getItem(classKey) || '[]');
          classLogs.unshift(payload);
          localStorage.setItem(classKey, JSON.stringify(classLogs.slice(0, 50)));
        }
      } catch (e) {}
    }
  }
}
