
        // ============================================
        // COURSES PAGE JAVASCRIPT - SIMPLIFIED FILTERS
        // ============================================
        
        // Global variables (เหมือนเดิม)
        let allCoursesData = [];
        let filteredCourses = [];
        let displayedCourses = [];
        let currentPage = 1;
        const coursesPerPage = 6;
        
        // Filter state แบบง่าย (เหลือแค่ระดับการศึกษา)
        const activeFiltersSimple = {
            level: null  // เก็บเฉพาะระดับการศึกษา
        };
        
        // ข้อมูลระดับการศึกษาตามที่คุณต้องการ
        const levelData = [
            { 
                id: 'ปวช.', 
                name: 'ประกาศนียบัตรวิชาชีพ (ปวช.)', 
                count: 0,
                icon: 'fa-certificate',
                color: '#1e3a8a'
            },
            { 
                id: 'ปวส.', 
                name: 'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)', 
                count: 0,
                icon: 'fa-graduation-cap',
                color: '#f59e0b'
            },
            { 
                id: 'ปริญญาตรี', 
                name: 'ระดับปริญญาตรี', 
                count: 0,
                icon: 'fa-university',
                color: '#10b981'
            }
        ];
        
        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Courses page initialized with simplified filters');
            
            // Set current year in footer
            document.getElementById('currentYear').textContent = new Date().getFullYear();
            
            // Initialize simple filters
            initializeSimpleFilters();
            
            // Load courses data
            loadCoursesData();
            
            // Setup event listeners
            setupSimpleEventListeners();
            
            // Setup scroll to top button
            setupScrollToTop();
            
            // Highlight active nav link

            
            // Initial UI update
            updateCourseCounts();
        });
        
        // ============================================
        // Simple Filter Initialization
        // ============================================
        function initializeSimpleFilters() {
            populateLevelOptions();
        }
        
        function populateLevelOptions() {
            const container = document.getElementById('levelOptionsSimple');
            if (!container) return;
            
            let html = '';
            levelData.forEach(level => {
                html += `
                    <div class="level-option" data-level-id="${level.id}">
                        <div class="level-icon">
                            <i class="fas ${level.icon}"></i>
                        </div>
                        <div class="level-info">
                            <div class="level-name">${level.name}</div>
                            <div class="level-count">${level.count} หลักสูตร</div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
            
            // Add event listeners
            document.querySelectorAll('.level-option').forEach(option => {
                option.addEventListener('click', function() {
                    toggleLevelOption(this);
                });
            });
        }
        
        // ============================================
        // Simple Filter Logic
        // ============================================
        function toggleLevelOption(element) {
            const levelId = element.dataset.levelId;
            const isSelected = element.classList.contains('selected');
            
            // Clear other selections
            document.querySelectorAll('.level-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            if (isSelected) {
                // Deselect
                element.classList.remove('selected');
                activeFiltersSimple.level = null;
            } else {
                // Select
                element.classList.add('selected');
                activeFiltersSimple.level = levelId;
            }
            
            // Apply filters immediately
            applySimpleFilterLogic();
        }
        
        function clearSimpleFilters() {
            // Reset active filter
            activeFiltersSimple.level = null;
            
            // Update UI
            document.querySelectorAll('.level-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Reset search
            const searchInput = document.getElementById('coursesSearch');
            if (searchInput) searchInput.value = '';
            
            // Apply filters
            applySimpleFilterLogic();
        }
        
        function applySimpleFilterLogic() {
            currentPage = 1;
            
            // Filter courses based on active filters
            let filtered = [...allCoursesData];
            
            // Apply search filter
            const searchInput = document.getElementById('coursesSearch');
            if (searchInput && searchInput.value.trim() !== '') {
                const searchTerm = searchInput.value.trim().toLowerCase();
                filtered = filtered.filter(course => {
                    return (
                        (course.name && course.name.toLowerCase().includes(searchTerm)) ||
                        (course.description && course.description.toLowerCase().includes(searchTerm)) ||
                        (course.category && course.category.toLowerCase().includes(searchTerm))
                    );
                });
            }
            
            // Apply level filter
            if (activeFiltersSimple.level) {
                filtered = filtered.filter(course => course.level === activeFiltersSimple.level);
            }
            
            // Update filtered courses
            filteredCourses = filtered;
            
            // Update UI
            updateCourseCounts();
            renderCourses();
            
            // Show/hide empty state
            const emptyStateElement = document.getElementById('emptyState');
            const containerElement = document.getElementById('coursesContainer');
            
            if (filteredCourses.length === 0 && emptyStateElement) {
                emptyStateElement.classList.remove('hidden');
                if (containerElement) containerElement.classList.add('hidden');
            } else if (emptyStateElement) {
                emptyStateElement.classList.add('hidden');
                if (containerElement) containerElement.classList.remove('hidden');
            }
        }
        
        // ============================================
        // Data Loading (เหมือนเดิม)
        // ============================================
        async function loadCoursesData() {
            const loading=document.getElementById('coursesLoading');
            loading.classList.remove('hidden');
            try{
                allCoursesData=await App.courses();
                levelData.forEach(level=>level.count=allCoursesData.filter(c=>c.level===level.id).length);
                populateLevelOptions();initializeCourses();
            }catch(error){App.error(document.getElementById('coursesContainer'),error.message,loadCoursesData);document.getElementById('coursesContainer').classList.remove('hidden');}
            finally{loading.classList.add('hidden');}
        }

        function initializeCourses() {
            console.log('Initializing courses:', allCoursesData.length);
            
            // Initialize filtered courses
            filteredCourses = [...allCoursesData];
            
            // Update counts
            updateCourseCounts();
            
            // Apply initial filters and render
            applySimpleFilterLogic();
            renderCourses();
            
            // Hide loading, show container
            const loadingElement = document.getElementById('coursesLoading');
            const containerElement = document.getElementById('coursesContainer');
            
            if (loadingElement) loadingElement.classList.add('hidden');
            if (containerElement) containerElement.classList.remove('hidden');
        }
        
        // ============================================
        // Rendering (เหมือนเดิม)
        // ============================================
        function renderCourses() {
            const containerElement = document.getElementById('coursesContainer');
            if (!containerElement) return;
            
            // Calculate courses to display
            const startIndex = (currentPage - 1) * coursesPerPage;
            const endIndex = startIndex + coursesPerPage;
            displayedCourses = filteredCourses.slice(0, endIndex);
            
            // Clear container
            containerElement.innerHTML = '';
            
            // Render courses
            displayedCourses.forEach(function(course) {
                const courseElement = createCourseElement(course);
                containerElement.appendChild(courseElement);
            });
            
            // Update load more button
            updateLoadMoreButton();
            updateCourseCounts();
        }
        
        function createCourseElement(course) {
            const levelClass = course.level.includes('ปวส') ? 'pvs' : (course.level.includes('ปริญญา') ? 'pvch' : 'pvch');
            const levelText = course.level.includes('ปวส') ? 'ปวส.' : (course.level.includes('ปริญญา') ? 'ปริญญาตรี' : 'ปวช.');
            
            const element = document.createElement('div');
            element.tabIndex=0;element.setAttribute('role','button');element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openCourseModal(course);}});
            element.className = 'course-card-enhanced';
            element.setAttribute('data-course-id', course.id);
            
            // Determine if course is "hot" (low quota)
            const isHot = course.quota <= 15;
            
            element.innerHTML = `
                <div class="course-image-container">
                    <img src="${App.image(course.image) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}" 
                         alt="${App.escape(course.name)}" 
                         class="course-image"
                         onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'">
                    <div class="course-badge-overlay">
                        <span class="course-level-badge ${levelClass}">${levelText}</span>
                        ${course.system === 'ระบบทวิภาคี' ? '<span class="course-hot-badge"><i class="fas fa-handshake mr-1"></i> ทวิภาคี</span>' : ''}
                        ${isHot ? '<span class="course-hot-badge"><i class="fas fa-fire mr-1"></i> เปิดรับจำนวนจำกัด</span>' : ''}
                    </div>
                </div>
                <div class="course-content">
                    <h3 class="course-title">${App.escape(course.name || 'ไม่มีชื่อ')}</h3>
                    <p class="course-description">${App.escape(course.description || 'ไม่มีรายละเอียด')}</p>
                    <div class="course-meta">
                        <span class="course-category">${App.escape(course.category || 'ไม่มีหมวดหมู่')}</span>
                        <span class="course-quota">
                            <i class="fas fa-user-friends"></i> รับ ${course.quota || 0} คน
                        </span>
                    </div>
                </div>
            `;
            
            // Add click event to open modal
            element.addEventListener('click', function() {
                openCourseModal(course);
            });
            
            return element;
        }
        
        // ============================================
        // Course Modal (เหมือนเดิม)
        // ============================================
        function openCourseModal(course) {
            const modal = document.getElementById('courseModal');
            if (!modal) return;
            
            // Update modal content
            document.getElementById('modalCourseImage').src = App.image(course.image) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
            document.getElementById('modalCourseTitle').textContent = course.name || 'ไม่มีชื่อ';
            document.getElementById('modalCourseDesc').textContent = course.description || 'ไม่มีรายละเอียด';
            document.getElementById('modalCourseQuota').textContent = (course.quota || 0) + ' คน';
            
            document.getElementById('modalCourseDuration').textContent=course.duration||'สอบถามเจ้าหน้าที่';
            document.getElementById('modalCourseTuition').textContent=course.tuition||'สอบถามเจ้าหน้าที่';
            document.getElementById('modalCourseJobs').textContent=course.jobs||'สอบถามเจ้าหน้าที่';
            const applyLink=modal.querySelector('a[href^="/application"],a[data-admission-link]');applyLink.dataset.admissionLink='true';applyLink.href=course.level==='ปริญญาตรี'?'/contact':'/application?course='+encodeURIComponent(course.id);applyLink.textContent=course.level==='ปริญญาตรี'?'ติดต่อสอบถามการสมัคร':'สมัครเรียนหลักสูตรนี้';
            // Update badges
            const levelClass = course.level.includes('ปวส') ? 'pvs' : 'pvch';
            const levelText = course.level.includes('ปวส') ? 'ปวส.' : (course.level.includes('ปริญญา') ? 'ปริญญาตรี' : 'ปวช.');
            document.getElementById('modalCourseLevel').textContent = levelText;
            document.getElementById('modalCourseLevel').className = 'course-level-badge ' + levelClass;
            document.getElementById('modalCourseCategory').textContent = course.category || 'ไม่มีหมวดหมู่';
            
            // Generate sample job positions based on category
            const positions = Array.isArray(course.positions)?course.positions:[];
            const positionsContainer = document.getElementById('modalCoursePositions');
            if (positionsContainer) {
                positionsContainer.innerHTML = positions.map(function(pos) {
                    return `<span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">${App.escape(pos)}</span>`;
                }).join('');
            }
            
            // Show modal
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function generateJobPositions(category) {
            const positions = {
                'เทคโนโลยีสารสนเทศ': ['โปรแกรมเมอร์', 'นักพัฒนาเว็บ', 'ผู้ดูแลระบบ', 'นักวิเคราะห์ระบบ'],
                'อุตสาหกรรม': ['ช่างเทคนิค', 'ผู้ควบคุมเครื่องจักร', 'นักวางแผนการผลิต', 'ผู้ควบคุมคุณภาพ'],
                'พาณิชยกรรม': ['นักบัญชี', 'นักการตลาด', 'ผู้จัดการฝ่ายขาย', 'ที่ปรึกษาธุรกิจ'],
                'ศิลปกรรม': ['นักออกแบบกราฟิก', 'นักวาดภาพประกอบ', 'ผู้กำกับศิลป์', 'นักสร้างสรรค์เนื้อหา'],
                'คหกรรม': ['เชฟ', 'นักออกแบบเสื้อผ้า', 'ที่ปรึกษาด้านอาหาร', 'ผู้จัดการร้านอาหาร'],
                'การท่องเที่ยว': ['พนักงานโรงแรม', 'ไกด์ท่องเที่ยว', 'ผู้จัดการรีสอร์ท', 'ผู้จัดทัวร์']
            };
            
            return positions[category] || ['ช่างเทคนิค', 'ผู้ช่วยวิศวกร', 'ช่างประจำโรงงาน'];
        }
        
        // ============================================
        // UI Updates
        // ============================================
        function updateCourseCounts() {
            const coursesCount = document.getElementById('coursesCount');
            const filteredCount = document.getElementById('filteredCount');
            const totalCount = document.getElementById('totalCount');
            
            if (coursesCount) coursesCount.textContent = filteredCourses.length;
            if (filteredCount) filteredCount.textContent = displayedCourses.length;
            if (totalCount) totalCount.textContent = allCoursesData.length;
        }
        
        function updateLoadMoreButton() {
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (!loadMoreBtn) return;
            
            const totalFiltered = filteredCourses.length;
            const totalDisplayed = displayedCourses.length;
            
            if (totalDisplayed < totalFiltered) {
                loadMoreBtn.classList.remove('hidden');
            } else {
                loadMoreBtn.classList.add('hidden');
            }
        }
        
        // ============================================
        // Simple Event Listeners Setup
        // ============================================
        function setupSimpleEventListeners() {
            // Search input
            const searchInput = document.getElementById('coursesSearch');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    applySimpleFilterLogic();
                });
            }
            
            // Apply filters button
            const applyBtn = document.getElementById('applyFiltersSimple');
            if (applyBtn) {
                applyBtn.addEventListener('click', function() {
                    applySimpleFilterLogic();
                });
            }
            
            // Clear all filters button
            const clearBtn = document.getElementById('clearFiltersSimple');
            if (clearBtn) {
                clearBtn.addEventListener('click', function() {
                    clearSimpleFilters();
                });
            }
            
            // Load more button
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', function() {
                    currentPage++;
                    renderCourses();
                });
            }
            
            // Reset search
            const resetSearchBtn = document.getElementById('resetSearch');
            if (resetSearchBtn) {
                resetSearchBtn.addEventListener('click', function() {
                    clearSimpleFilters();
                });
            }
            
            // Modal close button
            const modalCloseBtn = document.getElementById('modalCloseBtn');
            const courseModal = document.getElementById('courseModal');
            
            if (modalCloseBtn && courseModal) {
                modalCloseBtn.addEventListener('click', function() {
                    courseModal.classList.remove('active');
                    document.body.style.overflow = 'auto';
                });
                
                // Close modal when clicking outside
                courseModal.addEventListener('click', function(event) {
                    if (event.target === courseModal) {
                        courseModal.classList.remove('active');
                        document.body.style.overflow = 'auto';
                    }
                });
                
                // Close modal with Escape key
                document.addEventListener('keydown', function(event) {
                    if (event.key === 'Escape' && courseModal.classList.contains('active')) {
                        courseModal.classList.remove('active');
                        document.body.style.overflow = 'auto';
                    }
                });
            }
        }
        
        // ============================================
        // Scroll to Top (เหมือนเดิม)
        // ============================================
        function setupScrollToTop() {
            const scrollTopBtn = document.getElementById('scrollTopBtn');
            
            if (scrollTopBtn) {
                window.addEventListener('scroll', function() {
                    if (window.pageYOffset > 300) {
                        scrollTopBtn.classList.add('visible');
                    } else {
                        scrollTopBtn.classList.remove('visible');
                    }
                });
                
                scrollTopBtn.addEventListener('click', function() {
                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                });
            }
        }
        
        // ============================================
        // Highlight Active Nav Link (เหมือนเดิม)
        // ============================================
        // ============================================
        // Mobile Menu Toggle (เหมือนเดิม)
        // ============================================
        // ============================================
        // Public Functions
        // ============================================
        window.openCourseModal = openCourseModal;
        
        console.log('Courses page with simplified filters loaded successfully');
    