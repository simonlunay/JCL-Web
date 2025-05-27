document.addEventListener("DOMContentLoaded", function () {
  // Existing hamburger menu code (unchanged)
  const hamburger = document.querySelector(".hamburger");
  const navBar = document.querySelector(".nav-bar");
  const dropdowns = document.querySelectorAll(".dropdown");

  if (hamburger && navBar) {
    hamburger.addEventListener("click", () => {
      navBar.classList.toggle("active");
    });
  }

  dropdowns.forEach((dropdown) => {
    const link = dropdown.querySelector("a");
    link.addEventListener("click", (e) => {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        dropdown.classList.toggle("open");
      }
    });
  });

  document.addEventListener("click", (e) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown.contains(e.target) && window.innerWidth <= 1024) {
        dropdown.classList.remove("open");
      }
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) {
      navBar.classList.remove("active");
      dropdowns.forEach((dropdown) => {
        dropdown.classList.remove("open");
      });
    }
  });

  // clamp protection
  window.addEventListener('resize', () => {
    document.body.style.overflowX = 'hidden';
  });

  // ----------- FORM VALIDATION --------------

  const form = document.querySelector('.support-form');
  const inputs = form ? form.querySelectorAll('.survey-input') : [];

  function validateInput(input) {
    const formGroup = input.closest('.form-group');
    const errorMsg = formGroup ? formGroup.querySelector('.error-message') : null;

    let valid = true;
    const value = input.value.trim();

    if (input.hasAttribute('required')) {
      if (!value) {
        valid = false;
      } else if (input.type === 'email') {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) valid = false;
      } else if (input.type === 'tel') {
        const phonePattern = /^\+?(\d[\d-. ]+)?(\([\d-. ]+\))?[\d-. ]+\d$/;
        if (!phonePattern.test(value)) valid = false;
      } else if (input.tagName.toLowerCase() === 'select') {
        if (!value) valid = false;
      }
    }

    if (!valid) {
      input.classList.add('invalid');
      if (errorMsg) errorMsg.classList.add('active');
    } else {
      input.classList.remove('invalid');
      if (errorMsg) errorMsg.classList.remove('active');
    }
    return valid;
  }

  inputs.forEach(input => {
    input.addEventListener('blur', () => {
      validateInput(input);
    });

    input.addEventListener('input', () => {
      if (input.classList.contains('invalid')) {
        validateInput(input);
      }
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      let allValid = true;
      inputs.forEach(input => {
        if (!validateInput(input)) {
          allValid = false;
        }
      });
      if (!allValid) {
        e.preventDefault();
        const firstInvalid = form.querySelector('.survey-input.invalid');
        if (firstInvalid) firstInvalid.focus();
      }
    });
  }

  // ----------- ADMIN ITEM MANAGEMENT --------------

  const adminForm = document.getElementById('addForm');
  const itemsList = document.getElementById('itemsList');

  window.fetchItems = async function () {
    if (!itemsList) return;
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      const items = await res.json();

      itemsList.innerHTML = '';
      items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
          <img src="${item.photoUrl || ''}" alt="${item.title}" style="height:50px; vertical-align:middle; margin-right:10px;">
          <strong>${item.title}</strong> - $${item.price}<br/>
          <small>${item.description}</small>
        `;

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.style.marginLeft = '10px';
        editBtn.onclick = () => openEditModal(item);

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.style.marginLeft = '10px';
        delBtn.onclick = async () => {
          if (!confirm(`Delete "${item.title}"?`)) return;
          try {
            const delRes = await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
            if (!delRes.ok) throw new Error('Failed to delete item');
            await window.fetchItems();
          } catch (err) {
            alert(err.message);
          }
        };

        li.appendChild(editBtn);
        li.appendChild(delBtn);
        itemsList.appendChild(li);
      });
    } catch (err) {
      alert(err.message);
    }
  };

  if (adminForm && itemsList) {
    adminForm.onsubmit = async e => {
      e.preventDefault();
      const formData = new FormData(adminForm);
      try {
        const res = await fetch('/api/items', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Failed to add item');
        adminForm.reset();
        await window.fetchItems();
      } catch (err) {
        alert(err.message);
      }
    };

    window.fetchItems();
  }

  // ----------- DYNAMIC DISPLAY OF ITEMS ON MAIN PAGE --------------

  const itemsContainer = document.getElementById('itemsContainer');

  async function loadDisplayedItems() {
    if (!itemsContainer) return;
    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error('Failed to fetch items');
      const items = await res.json();

      itemsContainer.innerHTML = '';

      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'vs-item-card';
        card.innerHTML = `
          <img src="${item.photoUrl || 'placeholder.jpg'}" alt="${item.title}" class="vs-item-photo" />
          <h3 class="vs-item-title">${item.title}</h3>
          <p class="vs-item-description">${item.description}</p>
          <p class="vs-item-price">$${Number(item.price).toFixed(2)}</p>
        `;
        itemsContainer.appendChild(card);
      });
    } catch (err) {
      console.error('Error loading displayed items:', err);
      itemsContainer.innerHTML = '<p>Failed to load items.</p>';
    }
  }

  loadDisplayedItems();

});

// Edit modal related handlers outside DOMContentLoaded because elements exist outside it
function openEditModal(item) {
  const modal = document.getElementById('editModal');
  if (!modal) return;
  modal.style.display = 'block';

  const editForm = modal.querySelector('form');
  if (!editForm) return;

  editForm.elements['id'].value = item.id;
  editForm.elements['title'].value = item.title;
  editForm.elements['description'].value = item.description;
  editForm.elements['price'].value = item.price;
  // photo input left empty to keep existing photo
}

const editModalCloseBtn = document.getElementById('editModalClose');
if (editModalCloseBtn) {
  editModalCloseBtn.onclick = () => {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
  };
}

window.onclick = (event) => {
  const modal = document.getElementById('editModal');
  if (modal && event.target == modal) {
    modal.style.display = 'none';
  }
};

const editForm = document.getElementById('editForm');
if (editForm) {
  editForm.onsubmit = async e => {
    e.preventDefault();
    const form = e.target;
    const id = form.elements['id'].value;

    const formData = new FormData(form);

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to update item');
      form.reset();
      const modal = document.getElementById('editModal');
      if (modal) modal.style.display = 'none';

      if (typeof window.fetchItems === 'function') {
        await window.fetchItems();
      } else {
        window.location.reload();
      }
    } catch (err) {
      alert(err.message);
    }
  };
}
