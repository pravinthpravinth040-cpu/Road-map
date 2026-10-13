/**
 * ============================================================================
 * SkillPath - Learning Roadmap & Progress Tracker
 * Core JavaScript Architecture with Supabase Cloud Sync & LocalStorage Fallback
 * ============================================================================
 */

// Storage Key
const STORAGE_KEY = 'skillpath_db_v1';

// Preset quick-add templates for IT Domains
const QUICK_ADD_TEMPLATES = {
  'AI Engineering': {
    name: 'AI Engineering',
    description: 'Master Machine Learning, Deep Learning, LLMs, and Generative AI pipelines.',
    icon: '🤖',
    color: '#8b5cf6',
    stages: [
      {
        id: 'stg_ai_1',
        title: 'Stage 1: Python & Math Foundations',
        weeks: 4,
        topics: [
          { id: 'top_ai_1', title: 'Python for Data & OOP Essentials', link: 'https://docs.python.org/3/', completed: false },
          { id: 'top_ai_2', title: 'Linear Algebra, Calculus & Probability', link: 'https://khanacademy.org/math', completed: false },
          { id: 'top_ai_3', title: 'NumPy & Pandas Data Manipulation', link: 'https://pandas.pydata.org/docs/', completed: false }
        ],
        projects: [
          { id: 'prj_ai_1', title: 'Exploratory Data Analysis (EDA) on Kaggle Dataset', link: '', completed: false }
        ]
      },
      {
        id: 'stg_ai_2',
        title: 'Stage 2: Machine Learning & Deep Learning',
        weeks: 6,
        topics: [
          { id: 'top_ai_4', title: 'Scikit-Learn Regression & Classification', link: 'https://scikit-learn.org/', completed: false },
          { id: 'top_ai_5', title: 'PyTorch Fundamentals & Neural Networks', link: 'https://pytorch.org/tutorials/', completed: false }
        ],
        projects: [
          { id: 'prj_ai_2', title: 'End-to-End Image Classifier with PyTorch', link: '', completed: false }
        ]
      },
      {
        id: 'stg_ai_3',
        title: 'Stage 3: LLMs & Modern GenAI Systems',
        weeks: 6,
        topics: [
          { id: 'top_ai_6', title: 'Hugging Face Transformers & Tokenizers', link: 'https://huggingface.co/learn', completed: false },
          { id: 'top_ai_7', title: 'Retrieval Augmented Generation (RAG) & Vector DBs', link: '', completed: false },
          { id: 'top_ai_8', title: 'LangChain / LlamaIndex Agentic Workflows', link: '', completed: false }
        ],
        projects: [
          { id: 'prj_ai_3', title: 'Production RAG Chatbot with Document Search', link: '', completed: false }
        ]
      }
    ]
  },

  'Full Stack Development': {
    name: 'Full Stack Development',
    description: 'Build robust web applications from frontend interfaces to backend databases.',
    icon: '💻',
    color: '#06b6d4',
    stages: [
      {
        id: 'stg_fs_1',
        title: 'Stage 1: Web Fundamentals',
        weeks: 4,
        topics: [
          { id: 'top_fs_1', title: 'Semantic HTML5, Accessibility & SEO', link: 'https://developer.mozilla.org', completed: false },
          { id: 'top_fs_2', title: 'Modern CSS3, Flexbox & CSS Grid', link: 'https://css-tricks.com', completed: false },
          { id: 'top_fs_3', title: 'Vanilla JavaScript (ES6+, DOM, Async/Await)', link: 'https://javascript.info', completed: false }
        ],
        projects: [
          { id: 'prj_fs_1', title: 'Responsive Portfolio with Interactive Theme', link: '', completed: false }
        ]
      },
      {
        id: 'stg_fs_2',
        title: 'Stage 2: Frontend Frameworks & State',
        weeks: 5,
        topics: [
          { id: 'top_fs_4', title: 'Component Architecture & Props/State', link: 'https://react.dev', completed: false },
          { id: 'top_fs_5', title: 'Client-side Routing & API Integration', link: '', completed: false }
        ],
        projects: [
          { id: 'prj_fs_2', title: 'Full Kanban Task Board with Local Persistence', link: '', completed: false }
        ]
      },
      {
        id: 'stg_fs_3',
        title: 'Stage 3: Backend, DBs & Authentication',
        weeks: 6,
        topics: [
          { id: 'top_fs_6', title: 'Node.js, Express & RESTful API Design', link: 'https://nodejs.org', completed: false },
          { id: 'top_fs_7', title: 'PostgreSQL / MongoDB Data Modeling', link: '', completed: false },
          { id: 'top_fs_8', title: 'JWT Authentication & Security Best Practices', link: '', completed: false }
        ],
        projects: [
          { id: 'prj_fs_3', title: 'Full Stack SaaS MVP with Auth & Database', link: '', completed: false }
        ]
      }
    ]
  },

  'Data Science': {
    name: 'Data Science',
    description: 'Transform raw data into actionable insights through statistics, modeling, and visualization.',
    icon: '📊',
    color: '#10b981',
    stages: [
      {
        id: 'stg_ds_1',
        title: 'Stage 1: Data Wrangling & SQL',
        weeks: 4,
        topics: [
          { id: 'top_ds_1', title: 'Advanced SQL Queries & Joins', link: 'https://mode.com/sql-tutorial/', completed: false },
          { id: 'top_ds_2', title: 'Pandas & NumPy Data Cleaning', link: '', completed: false }
        ],
        projects: [
          { id: 'prj_ds_1', title: 'E-commerce Sales Analytics Pipeline', link: '', completed: false }
        ]
      },
      {
        id: 'stg_ds_2',
        title: 'Stage 2: Statistical Analysis & Visualization',
        weeks: 5,
        topics: [
          { id: 'top_ds_3', title: 'Hypothesis Testing & A/B Testing', link: '', completed: false },
          { id: 'top_ds_4', title: 'Interactive Dashboards with Plotly & Streamlit', link: 'https://streamlit.io', completed: false }
        ],
        projects: [
          { id: 'prj_ds_2', title: 'Live Interactive Business Intelligence Dashboard', link: '', completed: false }
        ]
      }
    ]
  },

  'Cybersecurity': {
    name: 'Cybersecurity',
    description: 'Defend systems, networks, and applications against modern digital threats.',
    icon: '🛡️',
    color: '#ef4444',
    stages: [
      {
        id: 'stg_cs_1',
        title: 'Stage 1: Networking & OS Security',
        weeks: 4,
        topics: [
          { id: 'top_cs_1', title: 'TCP/IP, DNS, Subnetting & OSI Model', link: 'https://www.wireshark.org', completed: false },
          { id: 'top_cs_2', title: 'Linux CLI & Permissions Hardening', link: '', completed: false }
        ],
        projects: [
          { id: 'prj_cs_1', title: 'Packet Sniffing & Traffic Analysis Lab', link: '', completed: false }
        ]
      },
      {
        id: 'stg_cs_2',
        title: 'Stage 2: Web App Security & Pentesting',
        weeks: 6,
        topics: [
          { id: 'top_cs_3', title: 'OWASP Top 10 Vulnerabilities', link: 'https://owasp.org', completed: false },
          { id: 'top_cs_4', title: 'Burp Suite & Penetration Testing Basics', link: '', completed: false }
        ],
        projects: [
          { id: 'prj_cs_2', title: 'Vulnerable Web App Exploitation & Audit Report', link: '', completed: false }
        ]
      }
    ]
  },

  'DevOps': {
    name: 'DevOps & Cloud',
    description: 'Automate deployments, orchestrate containers, and architect scalable cloud infrastructure.',
    icon: '🚀',
    color: '#f59e0b',
    stages: [
      {
        id: 'stg_do_1',
        title: 'Stage 1: Linux, Git & Scripting',
        weeks: 3,
        topics: [
          { id: 'top_do_1', title: 'Bash Scripting & Automation', link: '', completed: false },
          { id: 'top_do_2', title: 'Git Branching Strategies & Hooks', link: '', completed: false }
        ],
        projects: [
          { id: 'prj_do_1', title: 'Automated Server Setup & Health Script', link: '', completed: false }
        ]
      },
      {
        id: 'stg_do_2',
        title: 'Stage 2: Containers & CI/CD',
        weeks: 5,
        topics: [
          { id: 'top_do_3', title: 'Docker Containers & Multi-stage Builds', link: 'https://docs.docker.com', completed: false },
          { id: 'top_do_4', title: 'GitHub Actions Continuous Integration', link: '', completed: false },
          { id: 'top_do_5', title: 'Kubernetes Pods, Services & Deployments', link: 'https://kubernetes.io/docs/', completed: false }
        ],
        projects: [
          { id: 'prj_do_2', title: 'Multi-service Container Orchestration Cluster', link: '', completed: false }
        ]
      }
    ]
  },

  'Mobile Development': {
    name: 'Mobile Development',
    description: 'Create native and cross-platform mobile apps for iOS and Android devices.',
    icon: '📱',
    color: '#ec4899',
    stages: [
      {
        id: 'stg_mb_1',
        title: 'Stage 1: Mobile UI & Cross-Platform Core',
        weeks: 4,
        topics: [
          { id: 'top_mb_1', title: 'React Native / Flutter Layout & State', link: 'https://reactnative.dev', completed: false },
          { id: 'top_mb_2', title: 'Navigation Stacks & Gestures', link: '', completed: false }
        ],
        projects: [
          { id: 'prj_mb_1', title: 'Cross-platform Habit Tracker App', link: '', completed: false }
        ]
      },
      {
        id: 'stg_mb_2',
        title: 'Stage 2: Device APIs & Publishing',
        weeks: 5,
        topics: [
          { id: 'top_mb_3', title: 'Local SQLite Storage & Offline Mode', link: '', completed: false },
          { id: 'top_mb_4', title: 'Camera, Push Notifications & Location', link: '', completed: false },
          { id: 'top_mb_5', title: 'App Store & Google Play Deployment', link: '', completed: false }
        ],
        projects: [
          { id: 'prj_mb_2', title: 'Offline-First Expense Tracker with Biometrics', link: '', completed: false }
        ]
      }
    ]
  }
};

/**
 * SkillPath Database Layer (Local Cache + Supabase Cloud Sync)
 */
const SkillPathDB = {
  // Retrieve storage from localStorage
  getData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return this.getDefaultData();
      }
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse localStorage data:', e);
      return this.getDefaultData();
    }
  },

  // Save to localStorage
  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  },

  getDefaultData() {
    return {
      domains: [],
      planner: {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      },
      skills: [],
      resources: []
    };
  },

  // Background Cloud Sync Trigger
  triggerCloudSyncDomain(domain) {
    if (typeof SkillPathAuth !== 'undefined' && typeof SkillPathCloud !== 'undefined') {
      SkillPathAuth.getUser().then(user => {
        if (user) {
          SkillPathCloud.saveRoadmap(domain);
        }
      }).catch(() => {});
    }
  },

  triggerCloudDeleteDomain(domainId) {
    if (typeof SkillPathAuth !== 'undefined' && typeof SkillPathCloud !== 'undefined') {
      SkillPathAuth.getUser().then(user => {
        if (user) {
          SkillPathCloud.deleteRoadmap(domainId);
        }
      }).catch(() => {});
    }
  },

  /**
   * Sync with Supabase Cloud:
   * Pulls user's cloud roadmaps, tasks, and resources.
   * If user has local items and cloud is empty, migrates local items to cloud.
   */
  async syncWithCloud() {
    if (typeof SkillPathAuth === 'undefined' || typeof SkillPathCloud === 'undefined') return false;

    try {
      const user = await SkillPathAuth.getUser();
      if (!user) return false;

      const isReady = await SkillPathCloud.isCloudAvailable();
      if (!isReady) {
        console.info('Supabase database tables are not ready or RLS is configured.');
        return false;
      }

      const cloudRoadmaps = await SkillPathCloud.fetchRoadmaps();
      const localData = this.getData();
      let hasChanges = false;

      // Safe migration for initial cloud login
      if (localData.domains && localData.domains.length > 0 && (!cloudRoadmaps || cloudRoadmaps.length === 0)) {
        await SkillPathMigrate.migrateLocalDataToCloud();
        const migrated = await SkillPathCloud.fetchRoadmaps();
        if (migrated && migrated.length > 0) {
          localData.domains = migrated;
          hasChanges = true;
        }
      } else if (cloudRoadmaps && cloudRoadmaps.length > 0) {
        localData.domains = cloudRoadmaps;
        hasChanges = true;
      }

      // Sync Planner Tasks
      const cloudPlanner = await SkillPathCloud.fetchPlannerTasks();
      if (cloudPlanner) {
        localData.planner = cloudPlanner;
        hasChanges = true;
      }

      // Sync Resources
      const cloudRes = await SkillPathCloud.fetchResources();
      if (cloudRes && cloudRes.length > 0) {
        localData.resources = cloudRes;
        hasChanges = true;
      }

      if (hasChanges) {
        this.saveData(localData);
      }

      return hasChanges;
    } catch (e) {
      console.warn('Sync with cloud error:', e);
      return false;
    }
  },

  // Domains Management
  getDomains() {
    return this.getData().domains || [];
  },

  getDomain(id) {
    const domains = this.getDomains();
    return domains.find(d => d.id === id || d.cloudId === id) || null;
  },

  addDomain({ name, description, icon, color }) {
    const data = this.getData();
    const exists = data.domains.some(d => d.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      return { success: false, error: 'A domain with this name already exists.' };
    }

    const newDomain = {
      id: 'dom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      description: description ? description.trim() : 'Personal learning roadmap.',
      icon: icon || '🎯',
      color: color || '#6366f1',
      stages: []
    };

    data.domains.push(newDomain);
    this.saveData(data);
    this.triggerCloudSyncDomain(newDomain);
    return { success: true, domain: newDomain };
  },

  addPresetDomain(key) {
    const template = QUICK_ADD_TEMPLATES[key];
    if (!template) return { success: false, error: 'Preset not found.' };

    const data = this.getData();
    const exists = data.domains.some(d => d.name.trim().toLowerCase() === template.name.trim().toLowerCase());
    if (exists) {
      return { success: false, error: `Domain "${template.name}" already exists in your roadmaps.` };
    }

    const newDomain = JSON.parse(JSON.stringify(template));
    newDomain.id = 'dom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    data.domains.push(newDomain);
    this.saveData(data);
    this.triggerCloudSyncDomain(newDomain);
    return { success: true, domain: newDomain };
  },

  updateDomain(id, { name, description, icon, color }) {
    const data = this.getData();
    const index = data.domains.findIndex(d => d.id === id || d.cloudId === id);
    if (index === -1) return { success: false, error: 'Domain not found.' };

    const duplicate = data.domains.some((d, idx) => idx !== index && d.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      return { success: false, error: 'Another domain already uses this name.' };
    }

    data.domains[index].name = name.trim();
    data.domains[index].description = description ? description.trim() : '';
    data.domains[index].icon = icon || data.domains[index].icon || '🎯';
    data.domains[index].color = color || data.domains[index].color || '#6366f1';

    this.saveData(data);
    this.triggerCloudSyncDomain(data.domains[index]);
    return { success: true, domain: data.domains[index] };
  },

  deleteDomain(id) {
    const data = this.getData();
    const initialLength = data.domains.length;
    data.domains = data.domains.filter(d => d.id !== id && d.cloudId !== id);
    if (data.domains.length === initialLength) {
      return { success: false, error: 'Domain not found.' };
    }
    this.saveData(data);
    this.triggerCloudDeleteDomain(id);
    return { success: true };
  },

  // Roadmap Stages Management
  addStage(domainId, { title, weeks }) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return { success: false, error: 'Domain not found.' };

    const newStage = {
      id: 'stg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      weeks: parseInt(weeks, 10) || 1,
      topics: [],
      projects: []
    };

    if (!domain.stages) domain.stages = [];
    domain.stages.push(newStage);
    this.saveData(data);
    this.triggerCloudSyncDomain(domain);
    return { success: true, stage: newStage };
  },

  updateStage(domainId, stageId, { title, weeks }) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return { success: false, error: 'Domain not found.' };

    const stage = domain.stages.find(s => s.id === stageId || s.cloudId === stageId);
    if (!stage) return { success: false, error: 'Stage not found.' };

    stage.title = title.trim();
    stage.weeks = parseInt(weeks, 10) || 1;
    this.saveData(data);
    this.triggerCloudSyncDomain(domain);
    return { success: true, stage };
  },

  deleteStage(domainId, stageId) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return { success: false, error: 'Domain not found.' };

    domain.stages = domain.stages.filter(s => s.id !== stageId && s.cloudId !== stageId);
    this.saveData(data);
    this.triggerCloudSyncDomain(domain);
    return { success: true };
  },

  moveStage(domainId, stageId, direction) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain || !domain.stages) return false;

    const idx = domain.stages.findIndex(s => s.id === stageId || s.cloudId === stageId);
    if (idx === -1) return false;

    if (direction === 'up' && idx > 0) {
      const temp = domain.stages[idx];
      domain.stages[idx] = domain.stages[idx - 1];
      domain.stages[idx - 1] = temp;
      this.saveData(data);
      this.triggerCloudSyncDomain(domain);
      return true;
    } else if (direction === 'down' && idx < domain.stages.length - 1) {
      const temp = domain.stages[idx];
      domain.stages[idx] = domain.stages[idx + 1];
      domain.stages[idx + 1] = temp;
      this.saveData(data);
      this.triggerCloudSyncDomain(domain);
      return true;
    }
    return false;
  },

  // Topics Management
  addTopic(domainId, stageId, { title, link }) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return { success: false, error: 'Domain not found.' };

    const stage = domain.stages.find(s => s.id === stageId || s.cloudId === stageId);
    if (!stage) return { success: false, error: 'Stage not found.' };

    const newTopic = {
      id: 'top_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      link: link ? link.trim() : '',
      completed: false
    };

    if (!stage.topics) stage.topics = [];
    stage.topics.push(newTopic);
    this.saveData(data);
    this.triggerCloudSyncDomain(domain);
    return { success: true, topic: newTopic };
  },

  updateTopic(domainId, stageId, topicId, { title, link }) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return { success: false };
    const stage = domain.stages.find(s => s.id === stageId || s.cloudId === stageId);
    if (!stage) return { success: false };
    const topic = stage.topics.find(t => t.id === topicId || t.cloudId === topicId);
    if (!topic) return { success: false };

    topic.title = title.trim();
    topic.link = link ? link.trim() : '';
    this.saveData(data);
    this.triggerCloudSyncDomain(domain);
    return { success: true, topic };
  },

  toggleTopic(domainId, stageId, topicId) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return false;
    const stage = domain.stages.find(s => s.id === stageId || s.cloudId === stageId);
    if (!stage) return false;
    const topic = stage.topics.find(t => t.id === topicId || t.cloudId === topicId);
    if (!topic) return false;

    topic.completed = !topic.completed;
    this.saveData(data);
    this.triggerCloudSyncDomain(domain);
    if (typeof SkillPathCloud !== 'undefined') {
      SkillPathCloud.updateProgressCompletion(topicId, topic.completed);
    }
    return topic.completed;
  },

  deleteTopic(domainId, stageId, topicId) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return false;
    const stage = domain.stages.find(s => s.id === stageId || s.cloudId === stageId);
    if (!stage) return false;

    stage.topics = stage.topics.filter(t => t.id !== topicId && t.cloudId !== topicId);
    this.saveData(data);
    this.triggerCloudSyncDomain(domain);
    return true;
  },

  moveTopic(domainId, stageId, topicId, direction) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return false;
    const stage = domain.stages.find(s => s.id === stageId || s.cloudId === stageId);
    if (!stage || !stage.topics) return false;

    const idx = stage.topics.findIndex(t => t.id === topicId || t.cloudId === topicId);
    if (idx === -1) return false;

    if (direction === 'up' && idx > 0) {
      const temp = stage.topics[idx];
      stage.topics[idx] = stage.topics[idx - 1];
      stage.topics[idx - 1] = temp;
      this.saveData(data);
      this.triggerCloudSyncDomain(domain);
      return true;
    } else if (direction === 'down' && idx < stage.topics.length - 1) {
      const temp = stage.topics[idx];
      stage.topics[idx] = stage.topics[idx + 1];
      stage.topics[idx + 1] = temp;
      this.saveData(data);
      this.triggerCloudSyncDomain(domain);
      return true;
    }
    return false;
  },

  // Projects Management
  addProject(domainId, stageId, { title, link }) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return { success: false, error: 'Domain not found.' };

    const stage = domain.stages.find(s => s.id === stageId || s.cloudId === stageId);
    if (!stage) return { success: false, error: 'Stage not found.' };

    const newProject = {
      id: 'prj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      link: link ? link.trim() : '',
      completed: false
    };

    if (!stage.projects) stage.projects = [];
    stage.projects.push(newProject);
    this.saveData(data);
    this.triggerCloudSyncDomain(domain);
    return { success: true, project: newProject };
  },

  toggleProject(domainId, stageId, projectId) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return false;
    const stage = domain.stages.find(s => s.id === stageId || s.cloudId === stageId);
    if (!stage) return false;
    const project = stage.projects.find(p => p.id === projectId || p.cloudId === projectId);
    if (!project) return false;

    project.completed = !project.completed;
    this.saveData(data);
    this.triggerCloudSyncDomain(domain);
    if (typeof SkillPathCloud !== 'undefined') {
      SkillPathCloud.updateProgressCompletion(projectId, project.completed);
    }
    return project.completed;
  },

  deleteProject(domainId, stageId, projectId) {
    const data = this.getData();
    const domain = data.domains.find(d => d.id === domainId || d.cloudId === domainId);
    if (!domain) return false;
    const stage = domain.stages.find(s => s.id === stageId || s.cloudId === stageId);
    if (!stage) return false;

    stage.projects = stage.projects.filter(p => p.id !== projectId && p.cloudId !== projectId);
    this.saveData(data);
    this.triggerCloudSyncDomain(domain);
    return true;
  },

  // Progress Calculation Helpers
  calculateStageProgress(stage) {
    const topics = stage.topics || [];
    const projects = stage.projects || [];
    const totalItems = topics.length + projects.length;
    if (totalItems === 0) return { total: 0, completed: 0, percentage: 0 };

    const completedTopics = topics.filter(t => t.completed).length;
    const completedProjects = projects.filter(p => p.completed).length;
    const completed = completedTopics + completedProjects;
    const percentage = Math.round((completed / totalItems) * 100);

    return { total: totalItems, completed, percentage };
  },

  calculateDomainProgress(domain) {
    if (!domain || !domain.stages || domain.stages.length === 0) {
      return { total: 0, completed: 0, percentage: 0, totalWeeks: 0 };
    }

    let total = 0;
    let completed = 0;
    let totalWeeks = 0;

    domain.stages.forEach(stage => {
      totalWeeks += parseInt(stage.weeks, 10) || 0;
      const t = stage.topics || [];
      const p = stage.projects || [];
      total += t.length + p.length;
      completed += t.filter(x => x.completed).length + p.filter(x => x.completed).length;
    });

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage, totalWeeks };
  },

  calculateOverallStats() {
    const domains = this.getDomains();
    let totalItems = 0;
    let completedItems = 0;

    domains.forEach(domain => {
      if (domain.stages) {
        domain.stages.forEach(stage => {
          const t = stage.topics || [];
          const p = stage.projects || [];
          totalItems += t.length + p.length;
          completedItems += t.filter(x => x.completed).length + p.filter(x => x.completed).length;
        });
      }
    });

    const overallPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      totalDomains: domains.length,
      totalItems,
      completedItems,
      overallPercentage
    };
  },

  // Weekly Planner CRUD
  getPlanner() {
    const data = this.getData();
    return data.planner || {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    };
  },

  addPlannerTask(day, text, priority = 'normal') {
    const data = this.getData();
    if (!data.planner) data.planner = {};
    if (!data.planner[day]) data.planner[day] = [];

    const newTask = {
      id: 'pt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      text: text.trim(),
      completed: false,
      priority
    };

    data.planner[day].push(newTask);
    this.saveData(data);
    if (typeof SkillPathCloud !== 'undefined') {
      SkillPathCloud.savePlannerTask(day, newTask);
    }
    return newTask;
  },

  togglePlannerTask(day, taskId) {
    const data = this.getData();
    if (!data.planner || !data.planner[day]) return false;
    const task = data.planner[day].find(t => t.id === taskId || t.cloudId === taskId);
    if (!task) return false;

    task.completed = !task.completed;
    this.saveData(data);
    if (typeof SkillPathCloud !== 'undefined') {
      SkillPathCloud.togglePlannerTask(taskId, task.completed);
    }
    return task.completed;
  },

  deletePlannerTask(day, taskId) {
    const data = this.getData();
    if (!data.planner || !data.planner[day]) return false;
    data.planner[day] = data.planner[day].filter(t => t.id !== taskId && t.cloudId !== taskId);
    this.saveData(data);
    if (typeof SkillPathCloud !== 'undefined') {
      SkillPathCloud.deletePlannerTask(taskId);
    }
    return true;
  },

  clearPlannerWeek() {
    const data = this.getData();
    data.planner = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
    };
    this.saveData(data);
    if (typeof SkillPathCloud !== 'undefined') {
      SkillPathCloud.clearPlannerTasks();
    }
    return true;
  },

  // Skills Matrix CRUD
  getSkills() {
    return this.getData().skills || [];
  },

  addSkill({ name, category, level }) {
    const data = this.getData();
    if (!data.skills) data.skills = [];

    const newSkill = {
      id: 'sk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      category: category ? category.trim() : 'General',
      level: level || 'Beginner'
    };

    data.skills.push(newSkill);
    this.saveData(data);
    return newSkill;
  },

  deleteSkill(id) {
    const data = this.getData();
    if (!data.skills) return false;
    data.skills = data.skills.filter(s => s.id !== id);
    this.saveData(data);
    return true;
  },

  // Resources CRUD
  getResources() {
    return this.getData().resources || [];
  },

  addResource({ title, url, domain, notes }) {
    const data = this.getData();
    if (!data.resources) data.resources = [];

    const newResource = {
      id: 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: title.trim(),
      url: url.trim(),
      domain: domain ? domain.trim() : 'General',
      notes: notes ? notes.trim() : ''
    };

    data.resources.push(newResource);
    this.saveData(data);
    if (typeof SkillPathCloud !== 'undefined') {
      SkillPathCloud.saveResource(newResource);
    }
    return newResource;
  },

  deleteResource(id) {
    const data = this.getData();
    if (!data.resources) return false;
    data.resources = data.resources.filter(r => r.id !== id && r.cloudId !== id);
    this.saveData(data);
    if (typeof SkillPathCloud !== 'undefined') {
      SkillPathCloud.deleteResource(id);
    }
    return true;
  },

  // Backup & Restore
  exportJSON() {
    const data = this.getData();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `skillpath_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || !Array.isArray(parsed.domains)) {
        return { success: false, error: 'Invalid file format. Missing domains array.' };
      }
      this.saveData(parsed);
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Failed to parse JSON file.' };
    }
  }
};

/**
 * Global UI Notification Toast
 */
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/**
 * Modal Dialog Controller
 */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
    if (firstInput) firstInput.focus();
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Global modal background dismiss and Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach(modal => {
      modal.classList.remove('open');
    });
    document.body.style.overflow = '';
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Supabase Auth Navbar & Dialog Controller
 */
async function initAuthNavbar() {
  const container = document.getElementById('navAuthContainer');
  if (!container || typeof SkillPathAuth === 'undefined') return;

  const user = await SkillPathAuth.getUser();

  if (user) {
    const emailPrefix = user.email ? user.email.split('@')[0] : 'User';
    container.innerHTML = `
      <div class="user-profile-badge" title="${escapeHTML(user.email)}">
        <div class="user-avatar-icon">👤</div>
        <span class="user-email-text">${escapeHTML(emailPrefix)}</span>
      </div>
      <span class="cloud-sync-badge synced" title="Connected to Supabase Cloud">☁️ Synced</span>
      <button id="btnSignOut" class="btn btn-outline btn-sm">Log Out</button>
    `;

    const btnSignOut = document.getElementById('btnSignOut');
    if (btnSignOut) {
      btnSignOut.onclick = async () => {
        try {
          await SkillPathAuth.signOut();
          showToast('Signed out successfully.', 'info');
          setTimeout(() => window.location.reload(), 600);
        } catch (e) {
          showToast('Sign out error: ' + e.message, 'error');
        }
      };
    }
  } else {
    container.innerHTML = `
      <span class="cloud-sync-badge local" title="Data stored locally on this device">💾 Local</span>
      <button id="btnOpenAuthModal" class="btn btn-outline btn-sm">🔑 Sign In</button>
    `;

    const btnOpenAuth = document.getElementById('btnOpenAuthModal');
    if (btnOpenAuth) {
      btnOpenAuth.onclick = () => {
        openModal('modalAuth');
      };
    }
  }

  setupAuthModalListeners();
}

function setupAuthModalListeners() {
  const tabSignIn = document.getElementById('tabBtnSignIn');
  const tabSignUp = document.getElementById('tabBtnSignUp');
  const authModeInput = document.getElementById('authMode');
  const groupFullName = document.getElementById('groupFullName');
  const authSubmitText = document.getElementById('authSubmitText');
  const authAlert = document.getElementById('authAlert');
  const formAuth = document.getElementById('formAuth');

  if (tabSignIn && tabSignUp && formAuth) {
    tabSignIn.onclick = () => {
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      authModeInput.value = 'signin';
      if (groupFullName) groupFullName.style.display = 'none';
      if (authSubmitText) authSubmitText.textContent = 'Sign In';
      if (authAlert) authAlert.style.display = 'none';
    };

    tabSignUp.onclick = () => {
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      authModeInput.value = 'signup';
      if (groupFullName) groupFullName.style.display = 'block';
      if (authSubmitText) authSubmitText.textContent = 'Create Account';
      if (authAlert) authAlert.style.display = 'none';
    };

    formAuth.onsubmit = async (e) => {
      e.preventDefault();
      const mode = authModeInput.value;
      const email = document.getElementById('authEmail').value.trim();
      const password = document.getElementById('authPassword').value;
      const fullName = document.getElementById('authFullName') ? document.getElementById('authFullName').value.trim() : '';
      const submitBtn = document.getElementById('btnAuthSubmit');

      if (!email || !password) return;

      submitBtn.classList.add('btn-loading');
      submitBtn.disabled = true;
      if (authAlert) authAlert.style.display = 'none';

      try {
        if (mode === 'signup') {
          await SkillPathAuth.signUp(email, password, fullName);
          submitBtn.classList.remove('btn-loading');
          submitBtn.disabled = false;
          closeModal('modalAuth');
          showToast('Account registered! Safe cloud sync initiated.', 'success');
          await SkillPathMigrate.migrateLocalDataToCloud();
          setTimeout(() => window.location.reload(), 800);
        } else {
          await SkillPathAuth.signIn(email, password);
          submitBtn.classList.remove('btn-loading');
          submitBtn.disabled = false;
          closeModal('modalAuth');
          showToast('Welcome back! Cloud sync active.', 'success');
          await SkillPathDB.syncWithCloud();
          setTimeout(() => window.location.reload(), 800);
        }
      } catch (err) {
        submitBtn.classList.remove('btn-loading');
        submitBtn.disabled = false;
        if (authAlert) {
          authAlert.textContent = err.message || 'Authentication error';
          authAlert.style.display = 'block';
        }
      }
    };
  }
}

/**
 * Navigation Bar Initialization
 */
function initNavigation() {
  const toggleBtn = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // Backup & Restore buttons
  const exportBtn = document.getElementById('btnExportData');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      SkillPathDB.exportJSON();
      showToast('Data exported successfully!', 'success');
    });
  }

  const importBtn = document.getElementById('btnImportData');
  const importInput = document.getElementById('importFileInput');
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => {
      importInput.click();
    });

    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const res = SkillPathDB.importJSON(event.target.result);
        if (res.success) {
          showToast('Data imported successfully! Reloading...', 'success');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showToast(res.error || 'Failed to import backup.', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  // Supabase Auth Integration in Navbar
  initAuthNavbar();
}

/**
 * ============================================================================
 * PAGE 1: DASHBOARD (index.html)
 * ============================================================================
 */
async function initDashboard() {
  initNavigation();
  renderDashboardStats();
  renderDomainsGrid();
  setupAddDomainModal();
  setupQuickAddChips();

  // Background Cloud Sync
  SkillPathDB.syncWithCloud().then(hasUpdates => {
    if (hasUpdates) {
      renderDashboardStats();
      renderDomainsGrid();
    }
  });
}

function renderDashboardStats() {
  const stats = SkillPathDB.calculateOverallStats();
  const elTotalDomains = document.getElementById('statTotalDomains');
  const elTotalTopics = document.getElementById('statTotalTopics');
  const elCompletedTopics = document.getElementById('statCompletedTopics');
  const elOverallProgress = document.getElementById('statOverallProgress');

  if (elTotalDomains) elTotalDomains.textContent = stats.totalDomains;
  if (elTotalTopics) elTotalTopics.textContent = stats.totalItems;
  if (elCompletedTopics) elCompletedTopics.textContent = stats.completedItems;
  if (elOverallProgress) elOverallProgress.textContent = `${stats.overallPercentage}%`;
}

function renderDomainsGrid() {
  const domainsContainer = document.getElementById('domainsGrid');
  const emptyState = document.getElementById('emptyState');
  if (!domainsContainer) return;

  const domains = SkillPathDB.getDomains();

  if (domains.length === 0) {
    domainsContainer.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  domainsContainer.innerHTML = domains.map(domain => {
    const progress = SkillPathDB.calculateDomainProgress(domain);
    const stageCount = domain.stages ? domain.stages.length : 0;

    return `
      <article class="domain-card" data-id="${domain.id}">
        <div class="domain-card-accent-bar" style="background: ${escapeHTML(domain.color)};"></div>
        <div class="domain-card-body">
          <div class="domain-card-top">
            <div class="domain-badge-wrapper">
              <div class="domain-icon-box" style="background: ${escapeHTML(domain.color)}20; border: 1px solid ${escapeHTML(domain.color)}50;">
                <span>${escapeHTML(domain.icon)}</span>
              </div>
              <div>
                <h3 class="domain-card-title">${escapeHTML(domain.name)}</h3>
                <span class="stage-duration">${progress.totalWeeks} Estimated Weeks</span>
              </div>
            </div>
            <button class="btn btn-icon btn-outline btn-delete-domain" title="Delete Domain" data-id="${domain.id}">🗑️</button>
          </div>
          
          <p class="domain-card-desc">${escapeHTML(domain.description)}</p>

          <div class="progress-container">
            <div class="progress-header">
              <span class="progress-label">Progress</span>
              <span class="progress-percentage">${progress.completed}/${progress.total} (${progress.percentage}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${progress.percentage}%; background: ${escapeHTML(domain.color)};"></div>
            </div>
          </div>

          <div class="domain-meta">
            <span class="domain-meta-item">📁 ${stageCount} ${stageCount === 1 ? 'Stage' : 'Stages'}</span>
            <span class="domain-meta-item">📝 ${progress.total} Items</span>
          </div>
        </div>

        <div class="domain-card-footer">
          <button class="btn btn-outline btn-sm btn-edit-domain" data-id="${domain.id}">✏️ Edit Details</button>
          <a href="domain.html?id=${encodeURIComponent(domain.id)}" class="btn btn-primary btn-sm">Explore Roadmap →</a>
        </div>
      </article>
    `;
  }).join('');

  // Attach card event listeners
  domainsContainer.querySelectorAll('.btn-delete-domain').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const domainId = btn.getAttribute('data-id');
      const domain = SkillPathDB.getDomain(domainId);
      if (domain && confirm(`Are you sure you want to delete the roadmap for "${domain.name}"? This cannot be undone.`)) {
        SkillPathDB.deleteDomain(domainId);
        showToast(`Domain "${domain.name}" deleted.`, 'info');
        renderDashboardStats();
        renderDomainsGrid();
      }
    });
  });

  domainsContainer.querySelectorAll('.btn-edit-domain').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const domainId = btn.getAttribute('data-id');
      openEditDomainModal(domainId);
    });
  });
}

function setupAddDomainModal() {
  const openBtn = document.getElementById('btnOpenAddDomain');
  const emptyStateAddBtn = document.getElementById('btnEmptyAddDomain');
  const form = document.getElementById('formAddDomain');
  const colorDots = document.querySelectorAll('#addDomainColors .color-dot');
  const colorInput = document.getElementById('domainColor');

  if (openBtn) openBtn.addEventListener('click', () => openModal('modalAddDomain'));
  if (emptyStateAddBtn) emptyStateAddBtn.addEventListener('click', () => openModal('modalAddDomain'));

  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      if (colorInput) colorInput.value = dot.getAttribute('data-color');
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('domainName').value.trim();
      const description = document.getElementById('domainDesc').value.trim();
      const icon = document.getElementById('domainIcon').value.trim() || '🚀';
      const color = colorInput ? colorInput.value : '#6366f1';

      if (!name) {
        showToast('Please provide a domain name.', 'error');
        return;
      }

      const res = SkillPathDB.addDomain({ name, description, icon, color });
      if (res.success) {
        showToast(`Domain "${name}" created!`, 'success');
        form.reset();
        closeModal('modalAddDomain');
        renderDashboardStats();
        renderDomainsGrid();
      } else {
        showToast(res.error || 'Failed to add domain.', 'error');
      }
    });
  }

  const formEdit = document.getElementById('formEditDomain');
  if (formEdit) {
    formEdit.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('editDomainId').value;
      const name = document.getElementById('editDomainName').value.trim();
      const description = document.getElementById('editDomainDesc').value.trim();
      const icon = document.getElementById('editDomainIcon').value.trim();
      const color = document.getElementById('editDomainColor').value;

      const res = SkillPathDB.updateDomain(id, { name, description, icon, color });
      if (res.success) {
        showToast('Domain updated successfully.', 'success');
        closeModal('modalEditDomain');
        renderDashboardStats();
        renderDomainsGrid();
      } else {
        showToast(res.error || 'Failed to update domain.', 'error');
      }
    });
  }
}

function openEditDomainModal(domainId) {
  const domain = SkillPathDB.getDomain(domainId);
  if (!domain) return;

  const idInput = document.getElementById('editDomainId');
  const nameInput = document.getElementById('editDomainName');
  const descInput = document.getElementById('editDomainDesc');
  const iconInput = document.getElementById('editDomainIcon');
  const colorInput = document.getElementById('editDomainColor');

  if (idInput) idInput.value = domain.id;
  if (nameInput) nameInput.value = domain.name;
  if (descInput) descInput.value = domain.description;
  if (iconInput) iconInput.value = domain.icon;
  if (colorInput) colorInput.value = domain.color;

  openModal('modalEditDomain');
}

function setupQuickAddChips() {
  const container = document.getElementById('quickAddWrapper');
  if (!container) return;

  container.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.getAttribute('data-preset');
      const res = SkillPathDB.addPresetDomain(key);
      if (res.success) {
        showToast(`Added full roadmap for ${key}!`, 'success');
        renderDashboardStats();
        renderDomainsGrid();
      } else {
        showToast(res.error || 'Unable to add preset.', 'error');
      }
    });
  });
}

/**
 * ============================================================================
 * PAGE 2: DOMAIN ROADMAP BUILDER (domain.html)
 * ============================================================================
 */
async function initDomainView() {
  initNavigation();

  const params = new URLSearchParams(window.location.search);
  const domainId = params.get('id');

  if (!domainId) {
    showToast('No domain selected. Redirecting to dashboard...', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }

  const domain = SkillPathDB.getDomain(domainId);
  if (!domain) {
    showToast('Domain roadmap not found. Returning to dashboard.', 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 1500);
    return;
  }

  renderDomainHeader(domain);
  renderStages(domain);
  setupRoadmapModals(domain);

  // Background Cloud Sync
  SkillPathDB.syncWithCloud().then(hasUpdates => {
    if (hasUpdates) {
      refreshDomainView(domainId);
    }
  });
}

function renderDomainHeader(domain) {
  const progress = SkillPathDB.calculateDomainProgress(domain);

  const bannerIcon = document.getElementById('domainHeroIcon');
  const bannerTitle = document.getElementById('domainHeroTitle');
  const bannerDesc = document.getElementById('domainHeroDesc');
  const bannerWeeks = document.getElementById('domainHeroWeeks');
  const bannerPercent = document.getElementById('domainHeroPercent');
  const bannerFill = document.getElementById('domainHeroFill');
  const bannerGlow = document.getElementById('domainHeroGlow');

  if (bannerIcon) {
    bannerIcon.textContent = domain.icon;
    bannerIcon.style.background = `${domain.color}25`;
    bannerIcon.style.border = `1px solid ${domain.color}60`;
  }
  if (bannerTitle) bannerTitle.textContent = domain.name;
  if (bannerDesc) bannerDesc.textContent = domain.description;
  if (bannerWeeks) bannerWeeks.textContent = `${progress.totalWeeks} Estimated Weeks`;
  if (bannerPercent) bannerPercent.textContent = `${progress.completed}/${progress.total} Items (${progress.percentage}%)`;
  if (bannerFill) {
    bannerFill.style.width = `${progress.percentage}%`;
    bannerFill.style.background = domain.color;
  }
  if (bannerGlow) {
    bannerGlow.style.background = domain.color;
  }

  const btnDelete = document.getElementById('btnDeleteThisDomain');
  if (btnDelete) {
    btnDelete.onclick = () => {
      if (confirm(`Are you sure you want to delete the roadmap for "${domain.name}"?`)) {
        SkillPathDB.deleteDomain(domain.id);
        showToast('Domain removed.', 'info');
        setTimeout(() => { window.location.href = 'index.html'; }, 800);
      }
    };
  }

  const btnEdit = document.getElementById('btnEditThisDomain');
  if (btnEdit) {
    btnEdit.onclick = () => {
      document.getElementById('editDomainId').value = domain.id;
      document.getElementById('editDomainName').value = domain.name;
      document.getElementById('editDomainDesc').value = domain.description;
      document.getElementById('editDomainIcon').value = domain.icon;
      document.getElementById('editDomainColor').value = domain.color;
      openModal('modalEditDomain');
    };
  }
}

function renderStages(domain) {
  const stagesWrapper = document.getElementById('stagesWrapper');
  const emptyStages = document.getElementById('emptyStages');
  if (!stagesWrapper) return;

  const stages = domain.stages || [];

  if (stages.length === 0) {
    stagesWrapper.innerHTML = '';
    if (emptyStages) emptyStages.style.display = 'block';
    return;
  }

  if (emptyStages) emptyStages.style.display = 'none';

  stagesWrapper.innerHTML = stages.map((stage, idx) => {
    const stageProg = SkillPathDB.calculateStageProgress(stage);
    const topics = stage.topics || [];
    const projects = stage.projects || [];

    return `
      <section class="stage-card" data-stage-id="${stage.id}">
        <div class="stage-header">
          <div class="stage-title-wrap">
            <span class="stage-title">${escapeHTML(stage.title)}</span>
            <span class="stage-duration">⏳ ${stage.weeks} ${stage.weeks === 1 ? 'Week' : 'Weeks'}</span>
            <span class="section-badge">${stageProg.completed}/${stageProg.total} Done (${stageProg.percentage}%)</span>
          </div>
          <div class="stage-controls">
            <button class="btn btn-icon btn-outline btn-sm btn-move-stage-up" title="Move Up" data-stage-id="${stage.id}" ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn btn-icon btn-outline btn-sm btn-move-stage-down" title="Move Down" data-stage-id="${stage.id}" ${idx === stages.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn btn-icon btn-outline btn-sm btn-edit-stage" title="Edit Stage" data-stage-id="${stage.id}">✏️</button>
            <button class="btn btn-icon btn-danger btn-sm btn-delete-stage" title="Delete Stage" data-stage-id="${stage.id}">🗑️</button>
          </div>
        </div>

        <div class="progress-track" style="border-radius: 0; height: 4px;">
          <div class="progress-fill" style="width: ${stageProg.percentage}%; background: ${escapeHTML(domain.color)};"></div>
        </div>

        <div class="stage-body">
          <div class="items-list">
            ${topics.length === 0 && projects.length === 0 ? `
              <p style="font-size: 0.9rem; color: var(--text-dim); padding: 0.5rem 0;">No topics or mini-projects added to this stage yet.</p>
            ` : ''}

            <!-- Topics -->
            ${topics.map((t, tIdx) => `
              <div class="roadmap-item ${t.completed ? 'completed' : ''}" data-topic-id="${t.id}">
                <div class="item-left">
                  <input type="checkbox" class="custom-checkbox cb-topic" data-stage-id="${stage.id}" data-topic-id="${t.id}" ${t.completed ? 'checked' : ''} aria-label="Mark topic complete">
                  <span class="item-tag topic">Topic</span>
                  <span class="item-text">${escapeHTML(t.title)}</span>
                  ${t.link ? `<a href="${escapeHTML(t.link)}" target="_blank" rel="noopener noreferrer" class="item-link-btn" title="Open Resource">🔗 Docs</a>` : ''}
                </div>
                <div class="item-actions">
                  <button class="btn btn-icon btn-outline btn-sm btn-move-top-up" data-stage-id="${stage.id}" data-topic-id="${t.id}" ${tIdx === 0 ? 'disabled' : ''}>↑</button>
                  <button class="btn btn-icon btn-outline btn-sm btn-move-top-down" data-stage-id="${stage.id}" data-topic-id="${t.id}" ${tIdx === topics.length - 1 ? 'disabled' : ''}>↓</button>
                  <button class="btn btn-icon btn-danger btn-sm btn-delete-top" data-stage-id="${stage.id}" data-topic-id="${t.id}">×</button>
                </div>
              </div>
            `).join('')}

            <!-- Projects -->
            ${projects.map((p, pIdx) => `
              <div class="roadmap-item ${p.completed ? 'completed' : ''}" data-project-id="${p.id}">
                <div class="item-left">
                  <input type="checkbox" class="custom-checkbox cb-project" data-stage-id="${stage.id}" data-project-id="${p.id}" ${p.completed ? 'checked' : ''} aria-label="Mark project complete">
                  <span class="item-tag project">Mini Project</span>
                  <span class="item-text">${escapeHTML(p.title)}</span>
                  ${p.link ? `<a href="${escapeHTML(p.link)}" target="_blank" rel="noopener noreferrer" class="item-link-btn" title="View Project Specs">📁 Spec</a>` : ''}
                </div>
                <div class="item-actions">
                  <button class="btn btn-icon btn-outline btn-sm btn-move-prj-up" data-stage-id="${stage.id}" data-project-id="${p.id}" ${pIdx === 0 ? 'disabled' : ''}>↑</button>
                  <button class="btn btn-icon btn-outline btn-sm btn-move-prj-down" data-stage-id="${stage.id}" data-project-id="${p.id}" ${pIdx === projects.length - 1 ? 'disabled' : ''}>↓</button>
                  <button class="btn btn-icon btn-danger btn-sm btn-delete-prj" data-stage-id="${stage.id}" data-project-id="${p.id}">×</button>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 1rem;">
            <button class="btn btn-secondary btn-sm btn-open-add-topic" data-stage-id="${stage.id}">+ Add Topic</button>
            <button class="btn btn-outline btn-sm btn-open-add-project" data-stage-id="${stage.id}">+ Add Mini Project</button>
          </div>
        </div>
      </section>
    `;
  }).join('');

  attachStageItemEvents(domain);
}

function attachStageItemEvents(domain) {
  const container = document.getElementById('stagesWrapper');
  if (!container) return;

  container.querySelectorAll('.cb-topic').forEach(cb => {
    cb.addEventListener('change', () => {
      const stageId = cb.getAttribute('data-stage-id');
      const topicId = cb.getAttribute('data-topic-id');
      SkillPathDB.toggleTopic(domain.id, stageId, topicId);
      refreshDomainView(domain.id);
    });
  });

  container.querySelectorAll('.cb-project').forEach(cb => {
    cb.addEventListener('change', () => {
      const stageId = cb.getAttribute('data-stage-id');
      const projectId = cb.getAttribute('data-project-id');
      SkillPathDB.toggleProject(domain.id, stageId, projectId);
      refreshDomainView(domain.id);
    });
  });

  container.querySelectorAll('.btn-move-stage-up').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.getAttribute('data-stage-id');
      SkillPathDB.moveStage(domain.id, stageId, 'up');
      refreshDomainView(domain.id);
    });
  });

  container.querySelectorAll('.btn-move-stage-down').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.getAttribute('data-stage-id');
      SkillPathDB.moveStage(domain.id, stageId, 'down');
      refreshDomainView(domain.id);
    });
  });

  container.querySelectorAll('.btn-delete-stage').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.getAttribute('data-stage-id');
      if (confirm('Delete this stage and all its topics and projects?')) {
        SkillPathDB.deleteStage(domain.id, stageId);
        showToast('Stage deleted.', 'info');
        refreshDomainView(domain.id);
      }
    });
  });

  container.querySelectorAll('.btn-edit-stage').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.getAttribute('data-stage-id');
      const curDomain = SkillPathDB.getDomain(domain.id);
      const stage = curDomain.stages.find(s => s.id === stageId);
      if (!stage) return;

      document.getElementById('editStageId').value = stage.id;
      document.getElementById('editStageTitle').value = stage.title;
      document.getElementById('editStageWeeks').value = stage.weeks;
      openModal('modalEditStage');
    });
  });

  container.querySelectorAll('.btn-open-add-topic').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.getAttribute('data-stage-id');
      document.getElementById('addTopicStageId').value = stageId;
      document.getElementById('formAddTopic').reset();
      openModal('modalAddTopic');
    });
  });

  container.querySelectorAll('.btn-open-add-project').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.getAttribute('data-stage-id');
      document.getElementById('addProjectStageId').value = stageId;
      document.getElementById('formAddProject').reset();
      openModal('modalAddProject');
    });
  });

  container.querySelectorAll('.btn-delete-top').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.getAttribute('data-stage-id');
      const topicId = btn.getAttribute('data-topic-id');
      SkillPathDB.deleteTopic(domain.id, stageId, topicId);
      refreshDomainView(domain.id);
    });
  });

  container.querySelectorAll('.btn-delete-prj').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.getAttribute('data-stage-id');
      const projectId = btn.getAttribute('data-project-id');
      SkillPathDB.deleteProject(domain.id, stageId, projectId);
      refreshDomainView(domain.id);
    });
  });

  container.querySelectorAll('.btn-move-top-up').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.getAttribute('data-stage-id');
      const topicId = btn.getAttribute('data-topic-id');
      SkillPathDB.moveTopic(domain.id, stageId, topicId, 'up');
      refreshDomainView(domain.id);
    });
  });

  container.querySelectorAll('.btn-move-top-down').forEach(btn => {
    btn.addEventListener('click', () => {
      const stageId = btn.getAttribute('data-stage-id');
      const topicId = btn.getAttribute('data-topic-id');
      SkillPathDB.moveTopic(domain.id, stageId, topicId, 'down');
      refreshDomainView(domain.id);
    });
  });
}

function refreshDomainView(domainId) {
  const domain = SkillPathDB.getDomain(domainId);
  if (domain) {
    renderDomainHeader(domain);
    renderStages(domain);
  }
}

function setupRoadmapModals(domain) {
  const btnOpenAddStage = document.getElementById('btnOpenAddStage');
  const btnEmptyAddStage = document.getElementById('btnEmptyAddStage');
  const formAddStage = document.getElementById('formAddStage');

  if (btnOpenAddStage) btnOpenAddStage.addEventListener('click', () => openModal('modalAddStage'));
  if (btnEmptyAddStage) btnEmptyAddStage.addEventListener('click', () => openModal('modalAddStage'));

  if (formAddStage) {
    formAddStage.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('stageTitle').value.trim();
      const weeks = document.getElementById('stageWeeks').value;

      if (!title) {
        showToast('Please provide a stage title.', 'error');
        return;
      }

      SkillPathDB.addStage(domain.id, { title, weeks });
      showToast(`Added stage "${title}"`, 'success');
      formAddStage.reset();
      closeModal('modalAddStage');
      refreshDomainView(domain.id);
    });
  }

  const formEditStage = document.getElementById('formEditStage');
  if (formEditStage) {
    formEditStage.addEventListener('submit', (e) => {
      e.preventDefault();
      const stageId = document.getElementById('editStageId').value;
      const title = document.getElementById('editStageTitle').value.trim();
      const weeks = document.getElementById('editStageWeeks').value;

      SkillPathDB.updateStage(domain.id, stageId, { title, weeks });
      showToast('Stage updated.', 'success');
      closeModal('modalEditStage');
      refreshDomainView(domain.id);
    });
  }

  const formAddTopic = document.getElementById('formAddTopic');
  if (formAddTopic) {
    formAddTopic.addEventListener('submit', (e) => {
      e.preventDefault();
      const stageId = document.getElementById('addTopicStageId').value;
      const title = document.getElementById('topicTitle').value.trim();
      const link = document.getElementById('topicLink').value.trim();

      if (!title) {
        showToast('Please enter a topic title.', 'error');
        return;
      }

      SkillPathDB.addTopic(domain.id, stageId, { title, link });
      showToast('Topic added to stage.', 'success');
      closeModal('modalAddTopic');
      refreshDomainView(domain.id);
    });
  }

  const formAddProject = document.getElementById('formAddProject');
  if (formAddProject) {
    formAddProject.addEventListener('submit', (e) => {
      e.preventDefault();
      const stageId = document.getElementById('addProjectStageId').value;
      const title = document.getElementById('projectTitle').value.trim();
      const link = document.getElementById('projectLink').value.trim();

      if (!title) {
        showToast('Please enter a project title.', 'error');
        return;
      }

      SkillPathDB.addProject(domain.id, stageId, { title, link });
      showToast('Mini project added!', 'success');
      closeModal('modalAddProject');
      refreshDomainView(domain.id);
    });
  }

  const formEditDomain = document.getElementById('formEditDomain');
  if (formEditDomain) {
    formEditDomain.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('editDomainId').value;
      const name = document.getElementById('editDomainName').value.trim();
      const description = document.getElementById('editDomainDesc').value.trim();
      const icon = document.getElementById('editDomainIcon').value.trim();
      const color = document.getElementById('editDomainColor').value;

      const res = SkillPathDB.updateDomain(id, { name, description, icon, color });
      if (res.success) {
        showToast('Domain details updated.', 'success');
        closeModal('modalEditDomain');
        refreshDomainView(domain.id);
      } else {
        showToast(res.error || 'Failed to update domain.', 'error');
      }
    });
  }
}

/**
 * ============================================================================
 * PAGE 3: WEEKLY PLANNER & SKILLS MATRIX (planner.html)
 * ============================================================================
 */
async function initPlannerView() {
  initNavigation();
  renderWeeklyPlanner();
  renderSkillsTable();
  setupPlannerEvents();
  setupSkillsEvents();

  // Background Cloud Sync
  SkillPathDB.syncWithCloud().then(hasUpdates => {
    if (hasUpdates) {
      renderWeeklyPlanner();
    }
  });
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function renderWeeklyPlanner() {
  const container = document.getElementById('plannerGrid');
  if (!container) return;

  const planner = SkillPathDB.getPlanner();

  container.innerHTML = DAYS_OF_WEEK.map(day => {
    const tasks = planner[day] || [];
    const completedCount = tasks.filter(t => t.completed).length;

    return `
      <div class="planner-day-card" data-day="${day}">
        <div class="day-header">
          <span class="day-name">${day}</span>
          <span class="day-count">${completedCount}/${tasks.length} Done</span>
        </div>
        <div class="day-tasks-container">
          ${tasks.length === 0 ? `<p style="font-size: 0.8rem; color: var(--text-dim); text-align: center; margin: auto 0;">No tasks planned for ${day}.</p>` : ''}
          ${tasks.map(task => `
            <div class="day-task-item ${task.completed ? 'completed' : ''}">
              <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                <input type="checkbox" class="custom-checkbox cb-plan-task" data-day="${day}" data-task-id="${task.id}" ${task.completed ? 'checked' : ''} aria-label="Mark task done">
                <span>${escapeHTML(task.text)}</span>
              </div>
              <button class="btn btn-icon btn-danger btn-sm btn-del-plan-task" data-day="${day}" data-task-id="${task.id}" title="Delete task">×</button>
            </div>
          `).join('')}
        </div>
        <div class="day-footer">
          <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="openAddPlanTaskModal('${day}')">+ Add Task</button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.cb-plan-task').forEach(cb => {
    cb.addEventListener('change', () => {
      const day = cb.getAttribute('data-day');
      const taskId = cb.getAttribute('data-task-id');
      SkillPathDB.togglePlannerTask(day, taskId);
      renderWeeklyPlanner();
    });
  });

  container.querySelectorAll('.btn-del-plan-task').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.getAttribute('data-day');
      const taskId = btn.getAttribute('data-task-id');
      SkillPathDB.deletePlannerTask(day, taskId);
      renderWeeklyPlanner();
    });
  });
}

function openAddPlanTaskModal(day) {
  document.getElementById('planTaskDay').value = day;
  document.getElementById('planTaskDayLabel').textContent = day;
  document.getElementById('planTaskText').value = '';
  openModal('modalAddPlanTask');
}

function setupPlannerEvents() {
  const form = document.getElementById('formAddPlanTask');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const day = document.getElementById('planTaskDay').value;
      const text = document.getElementById('planTaskText').value.trim();

      if (!text) {
        showToast('Please type a task description.', 'error');
        return;
      }

      SkillPathDB.addPlannerTask(day, text);
      showToast(`Task added to ${day}!`, 'success');
      closeModal('modalAddPlanTask');
      renderWeeklyPlanner();
    });
  }

  const btnClearWeek = document.getElementById('btnClearPlanner');
  if (btnClearWeek) {
    btnClearWeek.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all tasks for this week?')) {
        SkillPathDB.clearPlannerWeek();
        showToast('Weekly planner reset.', 'info');
        renderWeeklyPlanner();
      }
    });
  }
}

// Skills Matrix
function renderSkillsTable() {
  const tableBody = document.getElementById('skillsTableBody');
  const emptyState = document.getElementById('emptySkillsState');
  if (!tableBody) return;

  const skills = SkillPathDB.getSkills();

  if (skills.length === 0) {
    tableBody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  tableBody.innerHTML = skills.map(skill => {
    let badgeClass = 'level-beginner';
    if (skill.level === 'Intermediate') badgeClass = 'level-intermediate';
    if (skill.level === 'Advanced') badgeClass = 'level-advanced';
    if (skill.level === 'Expert') badgeClass = 'level-expert';

    return `
      <tr>
        <td style="font-weight: 600;">${escapeHTML(skill.name)}</td>
        <td><span class="section-badge">${escapeHTML(skill.category)}</span></td>
        <td><span class="level-badge ${badgeClass}">${escapeHTML(skill.level)}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-icon btn-danger btn-sm" onclick="handleDeleteSkill('${skill.id}')" title="Delete Skill">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function handleDeleteSkill(skillId) {
  if (confirm('Remove this skill from your matrix?')) {
    SkillPathDB.deleteSkill(skillId);
    showToast('Skill deleted.', 'info');
    renderSkillsTable();
  }
}

function setupSkillsEvents() {
  const btnOpen = document.getElementById('btnOpenAddSkill');
  const form = document.getElementById('formAddSkill');

  if (btnOpen) btnOpen.addEventListener('click', () => openModal('modalAddSkill'));

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('skillName').value.trim();
      const category = document.getElementById('skillCategory').value.trim();
      const level = document.getElementById('skillLevel').value;

      if (!name) {
        showToast('Please enter skill name.', 'error');
        return;
      }

      SkillPathDB.addSkill({ name, category, level });
      showToast(`Skill "${name}" logged!`, 'success');
      form.reset();
      closeModal('modalAddSkill');
      renderSkillsTable();
    });
  }
}

/**
 * ============================================================================
 * PAGE 4: RESOURCES DIRECTORY (resources.html)
 * ============================================================================
 */
async function initResourcesView() {
  initNavigation();
  renderResourcesGrid();
  setupResourcesEvents();

  // Background Cloud Sync
  SkillPathDB.syncWithCloud().then(hasUpdates => {
    if (hasUpdates) {
      renderResourcesGrid();
    }
  });
}

function renderResourcesGrid(searchTerm = '', filterDomain = 'ALL') {
  const container = document.getElementById('resourcesGrid');
  const emptyState = document.getElementById('emptyResources');
  if (!container) return;

  let resources = SkillPathDB.getResources();

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    resources = resources.filter(r => 
      r.title.toLowerCase().includes(term) ||
      (r.notes && r.notes.toLowerCase().includes(term)) ||
      (r.domain && r.domain.toLowerCase().includes(term))
    );
  }

  if (filterDomain && filterDomain !== 'ALL') {
    resources = resources.filter(r => r.domain === filterDomain);
  }

  if (resources.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  container.innerHTML = resources.map(res => {
    return `
      <article class="resource-card" data-id="${res.id}">
        <div class="resource-card-header">
          <h3 class="resource-title">${escapeHTML(res.title)}</h3>
          <span class="resource-domain-tag">${escapeHTML(res.domain)}</span>
        </div>
        <p class="resource-notes">${escapeHTML(res.notes || 'No description provided.')}</p>
        <div class="resource-footer">
          <a href="${escapeHTML(res.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Visit Link ↗</a>
          <button class="btn btn-icon btn-danger btn-sm" onclick="handleDeleteResource('${res.id}')" title="Delete Resource">🗑️</button>
        </div>
      </article>
    `;
  }).join('');
}

function handleDeleteResource(id) {
  if (confirm('Delete this saved resource?')) {
    SkillPathDB.deleteResource(id);
    showToast('Resource removed.', 'info');
    renderResourcesGrid();
  }
}

function setupResourcesEvents() {
  const btnOpen = document.getElementById('btnOpenAddResource');
  const form = document.getElementById('formAddResource');
  const searchInput = document.getElementById('resourceSearch');
  const domainFilter = document.getElementById('resourceDomainFilter');

  if (btnOpen) {
    btnOpen.addEventListener('click', () => {
      const domainSelect = document.getElementById('resDomain');
      if (domainSelect) {
        const domains = SkillPathDB.getDomains();
        domainSelect.innerHTML = `
          <option value="General">General / All Domains</option>
          ${domains.map(d => `<option value="${escapeHTML(d.name)}">${escapeHTML(d.name)}</option>`).join('')}
        `;
      }
      openModal('modalAddResource');
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('resTitle').value.trim();
      const url = document.getElementById('resUrl').value.trim();
      const domain = document.getElementById('resDomain').value;
      const notes = document.getElementById('resNotes').value.trim();

      if (!title || !url) {
        showToast('Please provide both title and URL.', 'error');
        return;
      }

      SkillPathDB.addResource({ title, url, domain, notes });
      showToast(`Resource "${title}" saved!`, 'success');
      form.reset();
      closeModal('modalAddResource');
      renderResourcesGrid();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderResourcesGrid(e.target.value.trim(), domainFilter ? domainFilter.value : 'ALL');
    });
  }

  if (domainFilter) {
    const domains = SkillPathDB.getDomains();
    domainFilter.innerHTML = `
      <option value="ALL">All Categories</option>
      <option value="General">General</option>
      ${domains.map(d => `<option value="${escapeHTML(d.name)}">${escapeHTML(d.name)}</option>`).join('')}
    `;

    domainFilter.addEventListener('change', (e) => {
      renderResourcesGrid(searchInput ? searchInput.value.trim() : '', e.target.value);
    });
  }
}
