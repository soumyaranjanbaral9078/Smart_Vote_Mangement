
/* ==========================================
   SMARTVOTE - AUTHENTICATION SYSTEM
========================================== */

// DEMO ADMIN ACCOUNT
// These credentials are visible in frontend code.
// Never use this method for a real election system.

const ADMIN_EMAIL = "admin@smartvote.com";
const ADMIN_PASSWORD = "Admin@123";

const USERS_KEY = "smartVoteUsers";
const SESSION_KEY = "smartVoteUser";


// ==========================================
// 1. GET REGISTERED USERS
// ==========================================

function getUsers() {

    const users = localStorage.getItem(USERS_KEY);

    return users ? JSON.parse(users) : [];

}


// ==========================================
// 2. SAVE USERS
// ==========================================

function saveUsers(users) {

    localStorage.setItem(
        USERS_KEY,
        JSON.stringify(users)
    );

}


// ==========================================
// 3. PASSWORD HASHING
// ==========================================

// PBKDF2 uses Web Crypto to hash passwords.
// Requires localhost / HTTPS in supported browsers.

async function hashPassword(password, salt) {

    const encoder = new TextEncoder();

    const passwordData = encoder.encode(password);

    const saltData = encoder.encode(salt);

    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordData,
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: saltData,
            iterations: 120000,
            hash: "SHA-256"
        },
        keyMaterial,
        256
    );

    return Array.from(new Uint8Array(derivedBits))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

}


// ==========================================
// 4. GENERATE RANDOM SALT
// ==========================================

function generateSalt() {

    const randomBytes = crypto.getRandomValues(
        new Uint8Array(16)
    );

    return Array.from(randomBytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

}


// ==========================================
// 5. SHOW AUTHENTICATION MESSAGE
// ==========================================

function showMessage(message, type) {

    const messageBox = document.getElementById("authMessage");

    if (!messageBox) return;

    messageBox.textContent = message;

    messageBox.className = "auth-message show " + type;

}


// ==========================================
// 6. PASSWORD VISIBILITY
// ==========================================

function initializePasswordToggle() {

    document.querySelectorAll("[data-toggle]").forEach(button => {

        button.addEventListener("click", function () {

            const inputId = button.dataset.toggle;

            const passwordInput = document.getElementById(inputId);

            const icon = button.querySelector("i");

            if (passwordInput.type === "password") {

                passwordInput.type = "text";

                icon.className = "fa-solid fa-eye-slash";

                button.setAttribute("aria-label", "Hide password");

            } else {

                passwordInput.type = "password";

                icon.className = "fa-solid fa-eye";

                button.setAttribute("aria-label", "Show password");

            }

        });

    });

}


// ==========================================
// 7. VOTER REGISTRATION
// ==========================================

function initializeRegistration() {

    const registerForm = document.getElementById("registerForm");

    if (!registerForm) return;


    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name = document.getElementById("fullName").value.trim();

        const email = document.getElementById("email").value.trim().toLowerCase();

        const mobile = document.getElementById("mobile").value.trim();

        const password = document.getElementById("password").value;

        const confirmPassword = document.getElementById("confirmPassword").value;

        const terms = document.getElementById("terms").checked;


        // NAME VALIDATION

        if (!/^[a-zA-Z ]{2,60}$/.test(name)) {

            showMessage(
                "Enter a valid name using letters and spaces.",
                "error"
            );

            return;

        }


        // EMAIL VALIDATION

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

            showMessage(
                "Please enter a valid email address.",
                "error"
            );

            return;

        }


        // MOBILE VALIDATION

        if (!/^[6-9]\d{9}$/.test(mobile)) {

            showMessage(
                "Enter a valid 10-digit Indian mobile number.",
                "error"
            );

            return;

        }


        // PASSWORD VALIDATION

        if (
            password.length < 8 ||
            !/[A-Z]/.test(password) ||
            !/[a-z]/.test(password) ||
            !/[0-9]/.test(password)
        ) {

            showMessage(
                "Password must contain at least 8 characters, including uppercase, lowercase and a number.",
                "error"
            );

            return;

        }


        // CONFIRM PASSWORD

        if (password !== confirmPassword) {

            showMessage(
                "Password and Confirm Password do not match.",
                "error"
            );

            return;

        }


        // TERMS VALIDATION

        if (!terms) {

            showMessage(
                "Please accept the demonstration project terms.",
                "error"
            );

            return;

        }


        const users = getUsers();


        // DUPLICATE EMAIL CHECK

        const emailExists = users.some(user => user.email === email);

        if (emailExists || email === ADMIN_EMAIL) {

            showMessage(
                "This email address is already registered.",
                "error"
            );

            return;

        }


        // DUPLICATE MOBILE CHECK

        const mobileExists = users.some(user => user.mobile === mobile);

        if (mobileExists) {

            showMessage(
                "This mobile number is already registered.",
                "error"
            );

            return;

        }


        const submitButton = registerForm.querySelector("button[type='submit']");

        submitButton.disabled = true;

        submitButton.textContent = "Creating Account...";


        try {

            const salt = generateSalt();

            const passwordHash = await hashPassword(password, salt);

            const newUser = {

                id: "VOTER-" + Date.now(),

                name: name,

                email: email,

                mobile: mobile,

                passwordHash: passwordHash,

                salt: salt,

                role: "voter",

                status: "active",

                createdAt: new Date().toISOString()

            };


            users.push(newUser);

            saveUsers(users);


            showMessage(
                "Registration successful! Redirecting to login...",
                "success"
            );


            registerForm.reset();


            setTimeout(function () {

                window.location.href = "login.html";

            }, 1500);


        } catch (error) {

            console.error("Registration Error:", error);

            showMessage(
                "Registration failed. Please use Live Server and try again.",
                "error"
            );

        } finally {

            submitButton.disabled = false;

            submitButton.innerHTML =
                'Create Account <i class="fa-solid fa-arrow-right"></i>';

        }

    });

}


// ==========================================
// 8. LOGIN SYSTEM
// ==========================================

function initializeLogin() {

    const loginForm = document.getElementById("loginForm");

    if (!loginForm) return;


    // REMEMBER EMAIL

    const savedEmail = localStorage.getItem("smartVoteRememberEmail");

    if (savedEmail) {

        document.getElementById("loginEmail").value = savedEmail;

        document.getElementById("rememberMe").checked = true;

    }


    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const role = document.getElementById("loginRole").value;

        const email = document.getElementById("loginEmail").value.trim().toLowerCase();

        const password = document.getElementById("loginPassword").value;

        const rememberMe = document.getElementById("rememberMe").checked;


        const submitButton = loginForm.querySelector("button[type='submit']");

        submitButton.disabled = true;

        submitButton.textContent = "Verifying...";


        try {

            // ADMIN LOGIN

            if (role === "admin") {

                if (
                    email === ADMIN_EMAIL &&
                    password === ADMIN_PASSWORD
                ) {

                    const adminUser = {

                        id: "ADMIN-001",

                        name: "SmartVote Admin",

                        email: ADMIN_EMAIL,

                        role: "admin"

                    };

                    createSession(adminUser, rememberMe);

                    showMessage(
                        "Admin login successful! Redirecting...",
                        "success"
                    );

                    setTimeout(function () {

                        window.location.href = "admin-dashboard.html";

                    }, 1000);

                    return;

                }


                showMessage(
                    "Invalid administrator credentials.",
                    "error"
                );

                return;

            }


            // VOTER LOGIN

            const users = getUsers();

            const user = users.find(function (item) {

                return item.email === email &&
                       item.role === "voter";

            });


            if (!user) {

                showMessage(
                    "No voter account found. Please register first.",
                    "error"
                );

                return;

            }


            if (user.status !== "active") {

                showMessage(
                    "Your account is not active.",
                    "error"
                );

                return;

            }


            const enteredHash = await hashPassword(
                password,
                user.salt
            );


            if (enteredHash !== user.passwordHash) {

                showMessage(
                    "Incorrect password. Please try again.",
                    "error"
                );

                return;

            }


            const voterSession = {

                id: user.id,

                name: user.name,

                email: user.email,

                role: "voter"

            };


            createSession(voterSession, rememberMe);


            showMessage(
                "Login successful! Welcome " + user.name,
                "success"
            );


            setTimeout(function () {

                window.location.href = "voter-dashboard.html";

            }, 1000);


        } catch (error) {

            console.error("Login Error:", error);

            showMessage(
                "Login failed. Please try again.",
                "error"
            );

        } finally {

            submitButton.disabled = false;

            submitButton.innerHTML =
                'Sign In <i class="fa-solid fa-arrow-right"></i>';

        }

    });

}


// ==========================================
// 9. CREATE LOGIN SESSION
// ==========================================

function createSession(user, rememberMe) {

    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(user)
    );

    sessionStorage.setItem(
        "smartVoteSession",
        "active"
    );


    if (rememberMe) {

        localStorage.setItem(
            "smartVoteRememberEmail",
            user.email
        );

    } else {

        localStorage.removeItem("smartVoteRememberEmail");

    }

}


// ==========================================
// 10. GET CURRENT USER
// ==========================================

function getCurrentUser() {

    const session = sessionStorage.getItem(SESSION_KEY);

    return session ? JSON.parse(session) : null;

}


// ==========================================
// 11. LOGOUT
// ==========================================

function logout() {

    sessionStorage.removeItem(SESSION_KEY);

    sessionStorage.removeItem("smartVoteSession");

    window.location.href = "login.html";

}


// ==========================================
// 12. INITIALIZE AUTHENTICATION
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    initializePasswordToggle();

    initializeRegistration();

    initializeLogin();

});
