
        // ============================================
        // 8.1: CONFIGURATION (ค่าตัวแปรเริ่มต้น)
        // ============================================
        let currentStep = 1;           // ขั้นตอนปัจจุบัน
        const totalSteps = 4;          // จำนวนขั้นตอนทั้งหมด
        let selectedCourse = null;     // หลักสูตรที่เลือก
        let uploadedFile = null;       // ไฟล์ที่อัปโหลด
        
        // ============================================
        // 8.2: ข้อมูลหลักสูตรวิทยาลัยเทคนิคสมุทรปราการ
        // ============================================
        let courses = [];
        let isSubmitting=false, isTransitioning=false;
        let prepared=null;
        let requestId=crypto.randomUUID();
        let requestFingerprint=null;

        // ============================================
        // 8.3: DOM ELEMENTS (เก็บ Reference องค์ประกอบ HTML)
        // ============================================
        const applicationForm = document.getElementById('applicationForm');
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const submitBtn = document.getElementById('submitBtn');
        const saveDraftBtn = document.getElementById('saveDraftBtn');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const successModal = document.getElementById('successModal');
        const successModalContent = document.getElementById('successModalContent');
        const backToTopBtn = document.getElementById('backToTop');
        const eduFileUpload = document.getElementById('eduFileUpload');
        const eduFile = document.getElementById('eduFile');
        const eduFileList = document.getElementById('eduFileList');
        
        // องค์ประกอบสำหรับดรอปดาวน์หลักสูตร
        const courseDropdownBtn = document.getElementById('courseDropdownBtn');
        const courseDropdown = document.getElementById('courseDropdown');
        const selectedCourseText = document.getElementById('selectedCourseText');
        const selectedCourseId = document.getElementById('selectedCourseId');
        const selectedCourseInfo = document.getElementById('selectedCourseInfo');

        // ============================================
        // 8.4: ฟังก์ชันดรอปดาวน์หลักสูตร
        // ============================================
        /**
         * 8.4.1: populateCourseDropdown - เติมตัวเลือกในดรอปดาวน์หลักสูตร
         * กรองหลักสูตรตามระดับการศึกษาและระบบการศึกษาที่เลือก
         */
        function populateCourseDropdown() {
            if (!courseDropdown) return;
            
            const applyLevel = document.querySelector('input[name="applyLevel"]:checked');
            const educationSystem = document.querySelector('input[name="educationSystem"]:checked');
            
            if (!applyLevel || !educationSystem) {
                courseDropdown.innerHTML = '<div class="course-option p-4 text-gray-500">กรุณาเลือกระดับการศึกษาและระบบการศึกษาก่อน</div>';
                return;
            }
            
            // กรองหลักสูตรตามเงื่อนไข
            let filteredCourses = courses.filter(course => {
                return course.level === applyLevel.value && course.system === educationSystem.value;
            });
            
            if (filteredCourses.length === 0) {
                courseDropdown.innerHTML = '<div class="course-option p-4 text-gray-500">ไม่พบหลักสูตรที่ตรงกับเงื่อนไข</div>';
                return;
            }
            
            // จัดกลุ่มตามประเภทวิชา
            const groupedCourses = {};
            filteredCourses.forEach(course => {
                if (!groupedCourses[course.category]) {
                    groupedCourses[course.category] = [];
                }
                groupedCourses[course.category].push(course);
            });
            
            // สร้าง HTML สำหรับดรอปดาวน์
            let dropdownHTML = '';
            
            Object.entries(groupedCourses).forEach(([category, categoryCourses]) => {
                dropdownHTML += `
                    <div class="course-option-group">
                        <div class="p-3 bg-gray-100 text-gray-700 font-medium border-b border-gray-200">
                            ${App.escape(category)}
                        </div>
                `;
                
                categoryCourses.forEach(course => {
                    const badgeClass = course.system === 'ระบบทวิภาคี' ? 'badge-dual' : 
                                      course.level === 'ปวส.' ? 'badge-pvs' : 'badge-pvch';
                    const badgeText = course.system === 'ระบบทวิภาคี' ? 'ทวิภาคี' : 
                                     course.level === 'ปริญญาตรี' ? 'ปริญญาตรี' :
                                     course.level === 'ปวส.' ? 'ปวส.' : 'ปวช.';
                    
                    dropdownHTML += `
                        <div class="course-option p-4 hover:bg-blue-50 cursor-pointer" 
                             data-course-id="${App.escape(course.id)}"
                             data-course-name="${App.escape(course.name)}"
                             data-course-level="${App.escape(course.level)}"
                             data-course-system="${App.escape(course.system)}"
                             data-course-category="${App.escape(course.category)}"
                             data-course-description="${App.escape(course.description)}"
                             data-course-quota="${App.escape(course.quota)}">
                            <div class="flex justify-between items-start">
                                <div>
                                    <div class="font-medium text-gray-800">${App.escape(course.name)}</div>
                                    <div class="flex items-center mt-1">
                                        <span class="course-badge ${badgeClass}">${badgeText}</span>
                                        <span class="text-sm text-gray-500">${App.escape(course.quota)} ที่นั่ง</span>
                                    </div>
                                </div>
                                <i class="fas fa-check text-green-500 hidden"></i>
                            </div>
                        </div>
                    `;
                });
                
                dropdownHTML += '</div>';
            });
            
            courseDropdown.innerHTML = dropdownHTML;
            
            // เพิ่ม event listeners ให้แต่ละตัวเลือก
            const courseOptions = courseDropdown.querySelectorAll('.course-option');
            courseOptions.forEach(option => {
                option.addEventListener('click', function() {
                    selectCourseFromDropdown(this);
                });
            });
        }
        
        /**
         * 8.4.2: selectCourseFromDropdown - เลือกหลักสูตรจากดรอปดาวน์
         * @param {HTMLElement} optionElement - องค์ประกอบตัวเลือกที่คลิก
         */
        function selectCourseFromDropdown(optionElement) {
            // เอา selected class ออกจากตัวเลือกทั้งหมด
            const allOptions = courseDropdown.querySelectorAll('.course-option');
            allOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('.fa-check')?.classList.add('hidden');
            });
            
            // เพิ่ม selected class ให้ตัวเลือกที่เลือก
            optionElement.classList.add('selected');
            optionElement.querySelector('.fa-check').classList.remove('hidden');
            
            // อัปเดตข้อมูลหลักสูตรที่เลือก
            const courseId = optionElement.dataset.courseId;
            const courseName = optionElement.dataset.courseName;
            
            selectedCourseText.textContent = courseName;
            selectedCourseId.value = courseId;
            
            // ซ่อนดรอปดาวน์
            courseDropdown.classList.remove('active');
            
            // แสดงข้อมูลหลักสูตรที่เลือก
            updateSelectedCourseInfo(optionElement.dataset);
            
            // ลบ error ถ้ามี
            hideError('courseId');
            
            // เพิ่ม border สีเขียวเพื่อแสดงว่าตรวจสอบแล้ว
            const dropdownBtn = document.getElementById('courseDropdownBtn');
            if (dropdownBtn) {
                dropdownBtn.classList.remove('border-red-500');
                dropdownBtn.classList.add('border-green-500');
            }
        }
        
        /**
         * 8.4.3: updateSelectedCourseInfo - แสดงข้อมูลหลักสูตรที่เลือก
         * @param {Object} courseData - ข้อมูลหลักสูตร
         */
        function updateSelectedCourseInfo(courseData) {
            if (selectedCourseInfo) {
                document.getElementById('selectedCourseName').textContent = courseData.courseName;
                document.getElementById('selectedCourseLevel').textContent = courseData.courseLevel;
                document.getElementById('selectedCourseSystem').textContent = courseData.courseSystem;
                document.getElementById('selectedCourseCategory').textContent = courseData.courseCategory;
                document.getElementById('selectedCourseQuota').textContent = `${courseData.courseQuota} คน`;
                document.getElementById('selectedCourseDescription').textContent = courseData.courseDescription;
                
                selectedCourseInfo.classList.remove('hidden');
            }
            
            // บันทึกข้อมูลหลักสูตรที่เลือก
            selectedCourse = {
                id: courseData.courseId,
                name: courseData.courseName,
                level: courseData.courseLevel,
                system: courseData.courseSystem,
                category: courseData.courseCategory,
                description: courseData.courseDescription,
                quota: courseData.courseQuota
            };
        }
        
        /**
         * 8.4.4: clearCourseSelection - ล้างการเลือกหลักสูตร
         */
        function clearCourseSelection() {
            selectedCourseText.textContent = '-- เลือกสาขาวิชา --';
            selectedCourseId.value = '';
            selectedCourseInfo.classList.add('hidden');
            selectedCourse = null;
            
            // เอา selected class ออกจากตัวเลือกทั้งหมด
            const allOptions = courseDropdown.querySelectorAll('.course-option');
            allOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('.fa-check')?.classList.add('hidden');
            });
            
            // ลบ border สีเขียว
            const dropdownBtn = document.getElementById('courseDropdownBtn');
            if (dropdownBtn) {
                dropdownBtn.classList.remove('border-green-500');
            }
        }

        // ============================================
        // 8.5: VALIDATION FUNCTIONS (ฟังก์ชันตรวจสอบความถูกต้อง)
        // ============================================
        /**
         * 8.5.1: validateIdCard - ตรวจสอบเลขบัตรประชาชน 13 หลัก
         * @param {string} idCard - เลขบัตรประชาชน
         * @returns {boolean} - ถูกต้องหรือไม่
         */
        function validateIdCard(idCard) {
            const cleanIdCard = idCard.replace(/\D/g, '');
            if (/^(\d)\1{12}$/.test(cleanIdCard)) return false;
            if (cleanIdCard.length !== 13) return false;
            
            // Algorithm ตรวจสอบเลขประจำตัวประชาชน
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                sum += parseInt(cleanIdCard.charAt(i)) * (13 - i);
            }
            const checkDigit = (11 - (sum % 11)) % 10;
            return checkDigit === parseInt(cleanIdCard.charAt(12));
        }

        /**
         * 8.5.2: validatePhone - ตรวจสอบเบอร์โทรศัพท์ไทย
         * @param {string} phone - เบอร์โทรศัพท์
         * @returns {boolean} - ถูกต้องหรือไม่
         */
        function validatePhone(phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            return cleanPhone.match(/^0[689]\d{8}$/);
        }

        /**
         * 8.5.3: validateEmail - ตรวจสอบรูปแบบอีเมล
         * @param {string} email - อีเมล
         * @returns {boolean} - ถูกต้องหรือไม่
         */
        function validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        }

        /**
         * 8.5.4: validateBirthDate - ตรวจสอบอายุ (15-60 ปี)
         * @param {string} date - วันที่เกิด
         * @returns {boolean} - ถูกต้องหรือไม่
         */
        function validateBirthDate(date) {
            const birthDate = new Date(date);
            const today = new Date();
            const minAge = 15;
            const maxAge = 60;
            
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            return age >= minAge && age <= maxAge;
        }

        /**
         * 8.5.5: validateGPA - ตรวจสอบเกรดเฉลี่ย (0.00-4.00)
         * @param {string} gpa - เกรดเฉลี่ย
         * @returns {boolean} - ถูกต้องหรือไม่
         */
        function validateGPA(gpa) {
            const num = parseFloat(gpa);
            return !isNaN(num) && num >= 0 && num <= 4.0;
        }

        /**
         * 8.5.6: showError - แสดงข้อความ error
         * @param {HTMLElement|string} element - องค์ประกอบหรือชื่อฟิลด์
         * @param {string} message - ข้อความ error
         */
        function showError(element, message) {
            let errorElement;
            let targetElement;
            
            if (typeof element === 'string') {
                errorElement = document.getElementById(element + 'Error');
                
                // สำหรับ courseId ให้หา target element เป็นปุ่ม dropdown
                if (element === 'courseId') {
                    targetElement = document.getElementById('courseDropdownBtn');
                } else if (element === 'educationSystem' || element === 'applyLevel') {
                    // สำหรับ radio groups ให้แสดง error ใต้กลุ่ม
                    const group = document.querySelector(`[name="${element}"]`).closest('.form-group') || 
                                 document.querySelector(`[name="${element}"]`).closest('div');
                    targetElement = group;
                } else {
                    targetElement = document.querySelector(`[name="${element}"]`);
                }
            } else {
                errorElement = document.getElementById(element.name + 'Error');
                targetElement = element;
            }
            
            if (!errorElement && targetElement) {
                errorElement=document.createElement('div');
                errorElement.id=(typeof element==='string'?element:element.name)+'Error';
                errorElement.className='error-message text-red-500 text-sm mt-2';
                targetElement.parentElement.append(errorElement);
            }
            if(targetElement)targetElement.setAttribute('aria-invalid','true');
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.classList.remove('hidden');
                if (targetElement && targetElement.classList) {
                    if (targetElement.classList.contains('border-2')) {
                        targetElement.classList.add('border-red-500');
                    } else {
                        // เพิ่ม border แดงให้ container
                        const container = targetElement.closest('.border-2') || targetElement;
                        container.classList.add('border-red-500');
                    }
                }
                
                // Scroll ไปที่ element ที่ error
                if (targetElement) {
                    setTimeout(() => {
                        targetElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center'
                        });
                        
                        if (targetElement.focus) {
                            targetElement.focus();
                        }
                    }, 100);
                }
            }
        }

        /**
         * 8.5.7: hideError - ซ่อนข้อความ error
         * @param {HTMLElement|string} element - องค์ประกอบหรือชื่อฟิลด์
         */
        function hideError(element) {
            let errorElement;
            let targetElement;
            
            if (typeof element === 'string') {
                errorElement = document.getElementById(element + 'Error');
                
                // สำหรับ courseId ให้หา target element เป็นปุ่ม dropdown
                if (element === 'courseId') {
                    targetElement = document.getElementById('courseDropdownBtn');
                } else if (element === 'educationSystem' || element === 'applyLevel') {
                    const group = document.querySelector(`[name="${element}"]`).closest('.form-group') || 
                                 document.querySelector(`[name="${element}"]`).closest('div');
                    targetElement = group;
                } else {
                    targetElement = document.querySelector(`[name="${element}"]`);
                }
            } else {
                errorElement = document.getElementById(element.name + 'Error');
                targetElement = element;
            }
            
            if(targetElement)targetElement.removeAttribute('aria-invalid');
            if (errorElement) {
                errorElement.classList.add('hidden');
                if (targetElement && targetElement.classList) {
                    targetElement.classList.remove('border-red-500');
                }
            }
        }

        // ============================================
        // 8.6: FORM STEP FUNCTIONS (ฟังก์ชันจัดการขั้นตอน)
        // ============================================
        /**
         * 8.6.1: validateCurrentStep - ตรวจสอบความถูกต้องของขั้นตอนปัจจุบัน
         * @returns {boolean} - ถูกต้องหรือไม่
         */
        function validateCurrentStep() {
            const currentStepElement = document.getElementById('step' + currentStep);
            const requiredFields = currentStepElement.querySelectorAll('[required]');
            if(currentStep===2 && !uploadedFile){ alert('กรุณาแนบเอกสารรับรองการศึกษา'); return false; }
            let isValid = true;
            let firstErrorElement = null;

            // สำหรับขั้นตอนที่ 3: ตรวจสอบการเลือกระบบการศึกษาและระดับการศึกษา
            if (currentStep === 3) {
                const educationSystem = currentStepElement.querySelector('input[name="educationSystem"]:checked');
                const applyLevel = currentStepElement.querySelector('input[name="applyLevel"]:checked');
                
                if (!educationSystem) {
                    isValid = false;
                    showError('educationSystem', 'กรุณาเลือกระบบการศึกษา');
                } else {
                    hideError('educationSystem');
                }
                
                if (!applyLevel) {
                    isValid = false;
                    showError('applyLevel', 'กรุณาเลือกระดับการศึกษา');
                } else {
                    hideError('applyLevel');
                    
                    // ตรวจสอบการเลือกหลักสูตร
                    const courseId = document.getElementById('selectedCourseId').value;
                    if (!courseId) {
                        isValid = false;
                        showError('courseId', 'กรุณาเลือกหลักสูตรที่ต้องการสมัคร');
                    } else {
                        hideError('courseId');
                    }
                }
            }

            requiredFields.forEach(field => {
                // ข้าม validation สำหรับ courseId, educationSystem, applyLevel ในขั้นตอนที่ 3
                if (currentStep === 3 && ['courseId', 'educationSystem', 'applyLevel'].includes(field.name)) {
                    return;
                }
                
                if (field.type === 'radio') {
                    const radioGroup = currentStepElement.querySelectorAll(`[name="${field.name}"]`);
                    const isChecked = Array.from(radioGroup).some(radio => radio.checked);
                    if (!isChecked) {
                        isValid = false;
                        if (!firstErrorElement) firstErrorElement = radioGroup[0];
                        showError(field, 'กรุณาเลือก ' + getFieldLabel(field.name));
                    } else {
                        hideError(field);
                    }
                } else if (field.type === 'checkbox') {
                    if (!field.checked) {
                        isValid = false;
                        if (!firstErrorElement) firstErrorElement = field;
                        showError(field, 'กรุณายอมรับข้อกำหนดและเงื่อนไข');
                    } else {
                        hideError(field);
                    }
                } else {
                    const value = field.value.trim();
                    if (!value) {
                        isValid = false;
                        if (!firstErrorElement) firstErrorElement = field;
                        showError(field, 'กรุณากรอก' + getFieldLabel(field.name));
                    } else {
                        let fieldValid = true;
                        let errorMessage = '';
                        
                        // ตรวจสอบแต่ละฟิลด์ตามประเภท
                        switch (field.name) {
                            case 'idCard':
                                if (!validateIdCard(value)) {
                                    fieldValid = false;
                                    errorMessage = 'เลขบัตรประชาชนไม่ถูกต้อง';
                                }
                                break;
                            case 'phone':
                                if (!validatePhone(value)) {
                                    fieldValid = false;
                                    errorMessage = 'เบอร์โทรศัพท์ไม่ถูกต้อง';
                                }
                                break;
                            case 'email':
                                if (!validateEmail(value)) {
                                    fieldValid = false;
                                    errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
                                }
                                break;
                            case 'birthDate':
                                if (!validateBirthDate(value)) {
                                    fieldValid = false;
                                    errorMessage = 'อายุต้องอยู่ระหว่าง 15 - 60 ปี';
                                }
                                break;
                            case 'gpa':
                                if (!validateGPA(value)) {
                                    fieldValid = false;
                                    errorMessage = 'เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00 - 4.00';
                                }
                                break;
                        }
                        
                        if (!fieldValid) {
                            isValid = false;
                            if (!firstErrorElement) firstErrorElement = field;
                            showError(field, errorMessage);
                        } else {
                            hideError(field);
                        }
                    }
                }
            });

            // Scroll ไปที่ error แรก
            if (!isValid && firstErrorElement) {
                setTimeout(() => {
                    firstErrorElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center'
                    });
                    
                    if (firstErrorElement.focus) {
                        firstErrorElement.focus();
                    }
                }, 100);
            }

            return isValid;
        }

        /**
         * 8.6.2: getFieldLabel - ดึงข้อความ label จากชื่อฟิลด์
         * @param {string} fieldName - ชื่อฟิลด์
         * @returns {string} - ข้อความ label
         */
        function getFieldLabel(fieldName) {
            const labels = {
                'firstNameThai': 'ชื่อภาษาไทย',
                'lastNameThai': 'นามสกุลภาษาไทย',
                'idCard': 'เลขประจำตัวประชาชน',
                'birthDate': 'วันเดือนปีเกิด',
                'phone': 'เบอร์โทรศัพท์',
                'email': 'อีเมล',
                'address': 'ที่อยู่',
                'educationLevel': 'วุฒิการศึกษา',
                'schoolName': 'ชื่อโรงเรียน',
                'schoolProvince': 'จังหวัด',
                'graduationYear': 'ปีที่จบการศึกษา',
                'gpa': 'เกรดเฉลี่ย',
                'gender': 'เพศ',
                'schoolType': 'ประเภทโรงเรียน',
                'educationSystem': 'ระบบการศึกษา',
                'applyLevel': 'ระดับการศึกษา',
                'courseId': 'หลักสูตร'
            };
            return ' ' + (labels[fieldName] || fieldName);
        }

        // ============================================
        // 8.7: STEP NAVIGATION (ฟังก์ชันนำทางขั้นตอน)
        // ============================================
        /**
         * 8.7.1: nextStep - ไปขั้นตอนถัดไป
         */
        function nextStep() {
            if(isTransitioning || isSubmitting) return;
            if (!validateCurrentStep()) {
                return;
            }

            if (currentStep < totalSteps) {
                isTransitioning=true;
                const currentStepElement = document.getElementById('step' + currentStep);
                currentStepElement.classList.add('slide-in-left');
                
                updateProgressIndicators();
                
                setTimeout(() => {
                    currentStepElement.classList.remove('active');
                    currentStepElement.classList.remove('slide-in-left');
                    
                    currentStep++;
                    const nextStepElement = document.getElementById('step' + currentStep);
                    nextStepElement.classList.add('active', 'slide-in-right');
                    
                    if (currentStep === 3) {
                        populateCourseDropdown();
                    } else if (currentStep === 4) {
                        updateSummary();
                    }
                    
                    updateButtons();
                    updateProgressBar();
                    updateMobileStepTitle();
                    
                    updateProgressIndicators();
                    isTransitioning=false;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 300);
            }
        }

        /**
         * 8.7.2: prevStep - กลับไปขั้นตอนก่อนหน้า
         */
        function prevStep() {
            if(isTransitioning || isSubmitting) return;
            if (currentStep > 1) {
                isTransitioning=true;
                const currentStepElement = document.getElementById('step' + currentStep);
                currentStepElement.classList.add('slide-in-right');
                
                setTimeout(() => {
                    currentStepElement.classList.remove('active');
                    currentStepElement.classList.remove('slide-in-right');
                    
                    currentStep--;
                    const prevStepElement = document.getElementById('step' + currentStep);
                    prevStepElement.classList.add('active', 'slide-in-left');
                    
                    updateButtons();
                    updateProgressBar();
                    updateProgressIndicators();
                    updateMobileStepTitle();
                    
                    updateProgressIndicators();
                    isTransitioning=false;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 300);
            }
        }

        // ============================================
        // 8.8: UI UPDATE FUNCTIONS (ฟังก์ชันอัปเดต UI)
        // ============================================
        /**
         * 8.8.1: updateButtons - อัปเดตสถานะปุ่มนำทาง
         */
        function updateButtons() {
            if (prevBtn) {
                if (currentStep > 1) {
                    prevBtn.classList.remove('hidden');
                } else {
                    prevBtn.classList.add('hidden');
                }
            }
            
            if (nextBtn) {
                if (currentStep < totalSteps) {
                    nextBtn.classList.remove('hidden');
                } else {
                    nextBtn.classList.add('hidden');
                }
            }
            
            if (submitBtn) {
                if (currentStep === totalSteps) {
                    submitBtn.classList.remove('hidden');
                } else {
                    submitBtn.classList.add('hidden');
                }
            }
            
            if (saveDraftBtn) {
                if (currentStep < totalSteps) {
                    saveDraftBtn.classList.remove('hidden');
                } else {
                    saveDraftBtn.classList.add('hidden');
                }
            }
        }

        /**
         * 8.8.2: updateProgressBar - อัปเดตแถบความคืบหน้า
         */
        function updateProgressBar() {
            const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;
            
            const desktopProgressFill = document.getElementById('desktopProgressFill');
            if (desktopProgressFill) {
                desktopProgressFill.style.width = progressPercentage + '%';
            }
            
            const mobileProgressFill = document.getElementById('mobileProgressFill');
            if (mobileProgressFill) {
                mobileProgressFill.style.width = progressPercentage + '%';
            }
        }

        /**
         * 8.8.3: updateProgressIndicators - อัปเดตตัวบ่งชี้ขั้นตอน
         */
        function updateProgressIndicators() {
            document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
                const stepNumber = index + 1;
                const circle = indicator.querySelector('div');
                const text = indicator.querySelector('span');
                
                if (stepNumber <= currentStep) {
                    circle.classList.remove('bg-gray-200', 'text-gray-500');
                    circle.classList.add('bg-blue-900', 'text-white');
                    text.classList.remove('text-gray-500');
                    text.classList.add('text-blue-900', 'font-bold');
                } else {
                    circle.classList.remove('bg-blue-900', 'text-white');
                    circle.classList.add('bg-gray-200', 'text-gray-500');
                    text.classList.remove('text-blue-900', 'font-bold');
                    text.classList.add('text-gray-500');
                }
            });
        }

        /**
         * 8.8.4: updateMobileStepTitle - อัปเดตชื่อขั้นตอนบนมือถือ
         */
        function updateMobileStepTitle() {
            const titles = ['ข้อมูลส่วนตัว', 'ประวัติการศึกษา', 'เลือกหลักสูตร', 'ยืนยันข้อมูล'];
            const mobileTitle = document.getElementById('mobileStepTitle');
            if (mobileTitle) {
                mobileTitle.textContent = titles[currentStep - 1];
                const number=mobileTitle.previousElementSibling?.querySelectorAll('span')[1];
                if(number)number.textContent=currentStep;
            }
        }

        // ============================================
        // 8.9: FILE UPLOAD (ฟังก์ชันจัดการไฟล์)
        // ============================================
        /**
         * 8.9.1: setupFileUpload - ตั้งค่า Drag & Drop สำหรับไฟล์
         */
        function setupFileUpload() {
            if(!eduFileUpload || !eduFile)return;
            const accept=files=>{
                const file=files?.[0];if(!file)return;
                if(!['application/pdf','image/jpeg','image/png'].includes(file.type)||!file.size||file.size>5*1024*1024){
                    uploadedFile=null;eduFile.value='';eduFileList.replaceChildren();
                    alert('กรุณาเลือกไฟล์ PDF, JPG หรือ PNG ขนาดไม่เกิน 5MB');return;
                }
                uploadedFile=file;prepared=null;displayUploadedFile(file);
            };
            eduFileUpload.addEventListener('click',e=>{if(e.target!==eduFile)eduFile.click();});
            eduFile.addEventListener('change',()=>accept(eduFile.files));
            for(const event of ['dragenter','dragover','dragleave','drop'])eduFileUpload.addEventListener(event,e=>{e.preventDefault();e.stopPropagation();});
            eduFileUpload.addEventListener('dragover',()=>eduFileUpload.classList.add('dragover'));
            eduFileUpload.addEventListener('dragleave',()=>eduFileUpload.classList.remove('dragover'));
            eduFileUpload.addEventListener('drop',e=>{eduFileUpload.classList.remove('dragover');accept(e.dataTransfer.files);});
        }

        /**
         * 8.9.2: displayUploadedFile - แสดงไฟล์ที่อัปโหลด
         * @param {File} file - ไฟล์ที่อัปโหลด
         */
        function displayUploadedFile(file) {
            if (eduFileList) {
                const fileSize = (file.size / 1024 / 1024).toFixed(2);
                const fileType = file.type.split('/')[1].toUpperCase();
                
                eduFileList.innerHTML = `
                    <div class="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                        <div class="flex items-center">
                            <i class="fas fa-file-pdf text-2xl text-green-600 mr-3"></i>
                            <div>
                                <div class="font-medium text-gray-800">${App.escape(file.name)}</div>
                                <div class="text-sm text-gray-500">${fileType} • ${fileSize} MB</div>
                            </div>
                        </div>
                        <button type="button" onclick="removeUploadedFile()" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
            }
        }

        /**
         * 8.9.3: removeUploadedFile - ลบไฟล์ที่อัปโหลด
         */
        function removeUploadedFile() {
            uploadedFile = null;
            if (eduFile) eduFile.value = '';
            if (eduFileList) eduFileList.innerHTML = '';
        }

        // ============================================
        // 8.10: SUMMARY FUNCTIONS (ฟังก์ชันสรุปข้อมูล)
        // ============================================
        /**
         * 8.10.1: updateSummary - อัปเดตข้อมูลสรุปในขั้นตอนที่ 4
         */
        function updateSummary() {
            // Personal info
            const firstNameThai = document.querySelector('[name="firstNameThai"]');
            const lastNameThai = document.querySelector('[name="lastNameThai"]');
            const idCard = document.querySelector('[name="idCard"]');
            const birthDate = document.querySelector('[name="birthDate"]');
            const phone = document.querySelector('[name="phone"]');
            const address = document.querySelector('[name="address"]');
            
            if (firstNameThai && lastNameThai) {
                document.getElementById('summaryName').textContent = 
                    `${firstNameThai.value} ${lastNameThai.value}`;
            }
            
            if (idCard) {
                document.getElementById('summaryIdCard').textContent = 
                    idCard.value.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
            }
            
            if (birthDate) {
                const date = new Date(birthDate.value);
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                document.getElementById('summaryBirthDate').textContent = 
                    date.toLocaleDateString('th-TH', options);
            }
            
            if (phone) {
                document.getElementById('summaryPhone').textContent = phone.value;
            }
            
            if (address) {
                document.getElementById('summaryAddress').textContent = address.value;
            }
            
            // Education info
            const eduLevel = document.querySelector('[name="educationLevel"]');
            const schoolName = document.querySelector('[name="schoolName"]');
            const gpa = document.querySelector('[name="gpa"]');
            const graduationYear = document.querySelector('[name="graduationYear"]');
            
            if (eduLevel) {
                document.getElementById('summaryEduLevel').textContent = eduLevel.value;
            }
            
            if (schoolName) {
                document.getElementById('summarySchool').textContent = schoolName.value;
            }
            
            if (gpa) {
                document.getElementById('summaryGPA').textContent = gpa.value;
            }
            
            if (graduationYear) {
                document.getElementById('summaryGraduationYear').textContent = graduationYear.value;
            }
            
            // Course info
            if (selectedCourse) {
                document.getElementById('summaryCourseName').textContent = selectedCourse.name;
                document.getElementById('summaryCourseDesc').textContent = selectedCourse.description;
                document.getElementById('summaryCourseLevel').textContent = selectedCourse.level;
                document.getElementById('summaryCourseSystem').textContent = selectedCourse.system;
                document.getElementById('summaryCourseCategory').textContent = selectedCourse.category;
                document.getElementById('summaryCourseQuota').textContent = selectedCourse.quota;
            }
        }

        // ============================================
        // 8.11: FORM SUBMISSION (ฟังก์ชันส่งฟอร์ม)
        // ============================================
        /**
         * 8.11.1: submitForm - ส่งฟอร์มสมัครเรียน
         * @param {Event} e - Event object
         * @returns {boolean} - ส่งสำเร็จหรือไม่
         */
        async function submitForm(e) {
            e?.preventDefault();
            if(isSubmitting || isTransitioning)return false;
            // Revalidate every step before handing anything to the API.
            for(let step=1;step<=totalSteps;step++){
                currentStep=step;
                if(!validateCurrentStep()){
                    document.querySelectorAll('.form-step').forEach(el=>el.classList.toggle('active',el.id==='step'+step));
                    updateButtons();updateProgressBar();updateProgressIndicators();updateMobileStepTitle();return false;
                }
            }
            isSubmitting=true;submitBtn.disabled=true;loadingOverlay.classList.remove('hidden');
            const status=loadingOverlay.querySelector('p');
            try{
                const data=Object.fromEntries(new FormData(applicationForm));delete data.eduFile;data.terms=true;
                const file={name:uploadedFile.name,type:uploadedFile.type,size:uploadedFile.size,sha256:await App.sha256(uploadedFile)};
                const fingerprint=JSON.stringify({data,file});
                if(requestFingerprint!==null&&requestFingerprint!==fingerprint){requestId=crypto.randomUUID();prepared=null;}
                requestFingerprint=fingerprint;
                if(!prepared){
                    status.textContent='กำลังเตรียมเอกสาร...';
                    prepared=await App.api('application-prepare',{requestId,data,file});
                    prepared.uploaded=false;
                }
                if(!prepared.uploaded){status.textContent='กำลังอัปโหลดเอกสาร...';await App.upload(prepared.uploadUrl,uploadedFile);prepared.uploaded=true;}
                status.textContent='กำลังบันทึกข้อมูล...';
                const response=await App.api('applications',{data,token:prepared.token});
                updateSummary();
                document.getElementById('appNumberDisplay').textContent=response.applicationNumber;
                document.getElementById('appDateDisplay').textContent=new Date().toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'});
                successModal.classList.remove('hidden');
                successModalContent.classList.remove('scale-95','opacity-0');successModalContent.classList.add('scale-100','opacity-100');
                try{localStorage.removeItem('sptc.application.draft.v1');}catch{}
            }catch(error){if(prepared&&!prepared.uploaded)prepared=null;alert(error.message||'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่');}
            finally{isSubmitting=false;submitBtn.disabled=false;loadingOverlay.classList.add('hidden');}
            return false;
        }

        // ============================================
        // 8.12: UTILITY FUNCTIONS (ฟังก์ชันอรรถประโยชน์)
        // ============================================
        /**
         * 8.12.1: printApplication - พิมพ์ใบสมัคร
         */
        function printApplication() {
            // สร้างหน้าต่างใหม่สำหรับพิมพ์
            const printWindow = window.open('', '_blank');
            if(!printWindow){alert('กรุณาอนุญาตหน้าต่างป๊อปอัปเพื่อพิมพ์ใบสมัคร');return;}
            printWindow.document.write(`
                <!DOCTYPE html>
                <html lang="th">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>ใบสมัครเรียน - วิทยาลัยเทคนิคสมุทรปราการ</title>
                    <link rel="stylesheet" href="/assets/application.css">
                </head>
                <body>
                    <div class="header">
                        <div class="logo">วิทยาลัยเทคนิคสมุทรปราการ</div>
                        <div class="title">ใบสมัครเรียนสายอาชีพ</div>
                        <div>หมายเลขใบสมัคร: ${App.escape(document.getElementById('appNumberDisplay').textContent)}</div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">ข้อมูลส่วนตัว</div>
                        <div class="info-row">
                            <div class="info-label">ชื่อ-สกุล:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryName').textContent)}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">เลขบัตรประชาชน:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryIdCard').textContent)}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">วันเกิด:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryBirthDate').textContent)}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">เบอร์โทร:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryPhone').textContent)}</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">ประวัติการศึกษา</div>
                        <div class="info-row">
                            <div class="info-label">วุฒิการศึกษา:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryEduLevel').textContent)}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">โรงเรียน:</div>
                            <div class="info-value">${App.escape(document.getElementById('summarySchool').textContent)}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">เกรดเฉลี่ย:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryGPA').textContent)}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">ปีที่จบ:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryGraduationYear').textContent)}</div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <div class="section-title">หลักสูตรที่สมัคร</div>
                        <div class="info-row">
                            <div class="info-label">ชื่อหลักสูตร:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryCourseName').textContent)}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">ระดับการศึกษา:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryCourseLevel').textContent)}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">ระบบการศึกษา:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryCourseSystem').textContent)}</div>
                        </div>
                        <div class="info-row">
                            <div class="info-label">ประเภทวิชา:</div>
                            <div class="info-value">${App.escape(document.getElementById('summaryCourseCategory').textContent)}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
                        <p>พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')}</p>
                        <p>วิทยาลัยเทคนิคสมุทรปราการ</p>
                    </div>
                    
                    <button class="no-print" onclick="window.print()" style="position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; background: #1e3a8a; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        พิมพ์เอกสารนี้
                    </button>
                </body>
                </html>
            `);
            printWindow.document.close();
        }

        // ============================================
        // 8.13: EVENT LISTENERS (ตั้งค่า Event Listeners)
        // ============================================
        /**
         * 8.13.1: setupEventListeners - ตั้งค่า Event Listeners ทั้งหมด
         */
        function setupEventListeners() {
            // ปุ่มนำทาง
            if (nextBtn) {
                nextBtn.addEventListener('click', nextStep);
            }
            
            if (prevBtn) {
                prevBtn.addEventListener('click', prevStep);
            }
            
            if (submitBtn) {
                submitBtn.addEventListener('click', submitForm);
            }
            
            if (saveDraftBtn) {
                saveDraftBtn.addEventListener('click', () => {
                    try{
                        const data=Object.fromEntries(new FormData(applicationForm));delete data.eduFile;delete data.terms;
                        localStorage.setItem('sptc.application.draft.v1',JSON.stringify({data,at:Date.now()}));
                        alert('บันทึกแบบร่างไว้บนอุปกรณ์นี้แล้ว เมื่อกลับมาเปิดจะเรียกคืนให้ กรุณาแนบเอกสารอีกครั้ง');
                    }catch{alert('อุปกรณ์นี้ไม่อนุญาตให้บันทึกแบบร่าง');}
                });
            }
            
            if (applicationForm) {
                applicationForm.addEventListener('submit', submitForm);
            }
            
            // Back to top button
            if (backToTopBtn) {
                window.addEventListener('scroll', () => {
                    if (window.scrollY > 300) {
                        backToTopBtn.classList.remove('hidden');
                    } else {
                        backToTopBtn.classList.add('hidden');
                    }
                });
                
                backToTopBtn.addEventListener('click', () => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }
            
            // Course dropdown
            if (courseDropdownBtn) {
                courseDropdownBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    courseDropdown.classList.toggle('active');
                });
                
                document.addEventListener('click', function(e) {
                    if (!courseDropdown.contains(e.target) && !courseDropdownBtn.contains(e.target)) {
                        courseDropdown.classList.remove('active');
                    }
                });
                
                courseDropdown.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            }
            
            // เมื่อเลือกระบบการศึกษา/ระดับการศึกษา ให้อัปเดต dropdown หลักสูตร
            const systemRadios = document.querySelectorAll('input[name="educationSystem"]');
            const levelRadios = document.querySelectorAll('input[name="applyLevel"]');
            
            systemRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (currentStep === 3) {
                        clearCourseSelection();
                        populateCourseDropdown();
                        hideError('educationSystem');
                    }
                });
            });
            
            levelRadios.forEach(radio => {
                radio.addEventListener('change', () => {
                    if (currentStep === 3) {
                        clearCourseSelection();
                        populateCourseDropdown();
                        hideError('applyLevel');
                    }
                });
            });
            
            // Real-time validation สำหรับฟิลด์สำคัญ
            const validateOnBlur = ['idCard', 'phone', 'email', 'birthDate', 'gpa'];
            validateOnBlur.forEach(fieldName => {
                const field = document.querySelector(`[name="${fieldName}"]`);
                if (field) {
                    field.addEventListener('blur', () => {
                        const value = field.value.trim();
                        if (value) {
                            switch (fieldName) {
                                case 'idCard':
                                    if (!validateIdCard(value)) {
                                        showError(field, 'เลขบัตรประชาชนไม่ถูกต้อง');
                                    } else {
                                        hideError(field);
                                    }
                                    break;
                                case 'phone':
                                    if (!validatePhone(value)) {
                                        showError(field, 'เบอร์โทรศัพท์ไม่ถูกต้อง');
                                    } else {
                                        hideError(field);
                                    }
                                    break;
                                case 'email':
                                    if (!validateEmail(value)) {
                                        showError(field, 'รูปแบบอีเมลไม่ถูกต้อง');
                                    } else {
                                        hideError(field);
                                    }
                                    break;
                                case 'birthDate':
                                    if (!validateBirthDate(value)) {
                                        showError(field, 'อายุต้องอยู่ระหว่าง 15 - 60 ปี');
                                    } else {
                                        hideError(field);
                                    }
                                    break;
                                case 'gpa':
                                    if (!validateGPA(value)) {
                                        showError(field, 'เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00 - 4.00');
                                    } else {
                                        hideError(field);
                                    }
                                    break;
                            }
                        }
                    });
                }
            });
            
            // Auto-format ID card (เฉพาะตัวเลข 13 หลัก)
            const idCardInput = document.querySelector('[name="idCard"]');
            if (idCardInput) {
                idCardInput.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 13) value = value.substr(0, 13);
                    e.target.value = value;
                });
            }
            
            // Auto-format phone (เฉพาะตัวเลข 10 หลัก)
            const phoneInput = document.querySelector('[name="phone"]');
            if (phoneInput) {
                phoneInput.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 10) value = value.substr(0, 10);
                    e.target.value = value;
                });
            }
            

        }

        // ============================================
        // 8.14: INITIALIZATION (ฟังก์ชันเริ่มต้น)
        // ============================================
        /**
         * 8.14.1: initializeApplication - เริ่มต้นแอปพลิเคชัน
         */
        async function initializeApplication() {
            setupEventListeners();
            setupFileUpload();
            
            updateButtons();
            updateProgressBar();
            updateProgressIndicators();
            updateMobileStepTitle();
            
            // Keep graduation options usable while preserving the original labels and layout.
            const select=document.querySelector('[name="graduationYear"]');
            for(let year=2568;year<=new Date().getFullYear()+543;year++){const option=new Option(String(year),String(year));select.add(option,select.options[1]);}
            try{
                const draft=JSON.parse(localStorage.getItem('sptc.application.draft.v1')||'null');
                if(draft&&Date.now()-draft.at<7*86400000){
                    for(const [name,value]of Object.entries(draft.data||{})){
                        if(['eduFile','terms'].includes(name))continue;
                        for(const el of applicationForm.querySelectorAll('[name]'))if(el.name===name){if(el.type==='radio')el.checked=el.value===value;else el.value=value;}
                    }
                }else if(draft)localStorage.removeItem('sptc.application.draft.v1');
            }catch{}
            const load=async()=>{
                courseDropdownBtn.disabled=true;
                try{
                    courses=await App.courses();populateCourseDropdown();
                    const id=new URLSearchParams(location.search).get('course')||selectedCourseId.value;
                    const course=courses.find(c=>c.id===id);
                    if(course){
                        for(const [name,value]of Object.entries({applyLevel:course.level,educationSystem:course.system}))for(const el of document.querySelectorAll('[name="'+name+'"]'))el.checked=el.value===value;
                        populateCourseDropdown();const option=[...courseDropdown.querySelectorAll('[data-course-id]')].find(el=>el.dataset.courseId===id);if(option)selectCourseFromDropdown(option);
                    }
                }catch(error){App.error(courseDropdown,error.message,load);courseDropdown.classList.add('active');}
                finally{courseDropdownBtn.disabled=false;}
            };
            await load();
            // Set current year in footer
            document.getElementById('currentYear').textContent = new Date().getFullYear();
            

        }

        // ============================================
        // 8.15: START APPLICATION (เริ่มต้นแอปพลิเคชัน)
        // ============================================
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeApplication, 100);
        });

        // ============================================
        // 8.16: EXPORT FUNCTIONS (ทำให้ฟังก์ชันใช้งานได้จาก HTML)
        // ============================================
        window.nextStep = nextStep;
        window.prevStep = prevStep;
        window.clearCourseSelection = clearCourseSelection;
        window.removeUploadedFile = removeUploadedFile;
        window.printApplication = printApplication;
        window.submitForm = submitForm;
    