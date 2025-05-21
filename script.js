document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.querySelector(".hamburger");
  const navBar = document.querySelector(".nav-bar");
  const dropdowns = document.querySelectorAll(".dropdown");

  // Toggle navbar on hamburger click
  if (hamburger && navBar) {
    hamburger.addEventListener("click", () => {
      navBar.classList.toggle("active");
    });
  }

  // Toggle dropdowns on click (mobile/tablet only)
  dropdowns.forEach((dropdown) => {
    const link = dropdown.querySelector("a");
    link.addEventListener("click", (e) => {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        dropdown.classList.toggle("open");
      }
    });
  });

  // Close dropdowns if clicking outside
  document.addEventListener("click", (e) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown.contains(e.target) && window.innerWidth <= 1024) {
        dropdown.classList.remove("open");
      }
    });
  });

  // Reset nav and dropdown states on window resize
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) {
      navBar.classList.remove("active");
      dropdowns.forEach((dropdown) => {
        dropdown.classList.remove("open");
      });
    }
  });
});
//javascript clamp protection
window.addEventListener('resize', () => {
  document.body.style.overflowX = 'hidden';
});