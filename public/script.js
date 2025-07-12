document.addEventListener("DOMContentLoaded", function () {
  // Hamburger menu
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

  window.addEventListener('resize', () => {
    document.body.style.overflowX = 'hidden';
  });

  // ----------- ADMIN ITEM MANAGEMENT --------------

  const adminForm = document.getElementById('addForm');
  const itemsList = document.getElementById('itemsList');
  const statusMessage = document.getElementById('statusMessage');

  function showStatus(msg, duration = 3000) {
    if (!statusMessage) return;
    statusMessage.textContent = msg;
    statusMessage.style.display = 'block';
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, duration);
  }

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
          <img src="${item.photo_url || 'placeholder.png'}" alt="${item.title}" style="height:50px; vertical-align:middle; margin-right:10px;">
          <strong class="item-title" style="cursor:pointer; color:blue; text-decoration:underline;">${item.title}</strong><br/>
          <small>${item.description}</small>
        `;

        // Clicking title opens edit modal
        li.querySelector('.item-title').onclick = () => openEditModal(item);

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
            showStatus(`Deleted "${item.title}"`);
            await window.fetchItems();
          } catch (err) {
            showStatus(err.message);
          }
        };

        li.appendChild(editBtn);
        li.appendChild(delBtn);

        itemsList.appendChild(li);
      });
    } catch (err) {
      showStatus(err.message);
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
        showStatus('Item added successfully!');
        await window.fetchItems();
      } catch (err) {
        showStatus(err.message);
      }
    };

    window.fetchItems();
  }

  // ----------- USED PAGE ITEM DISPLAY --------------

  const usedItemsContainer = document.getElementById('itemsContainer');
  if (usedItemsContainer) {
    (async () => {
      try {
        const res = await fetch('/api/items');
        if (!res.ok) throw new Error('Failed to fetch items');
        const items = await res.json();

        usedItemsContainer.innerHTML = '';  // Clear container

        if (items.length === 0) {
          usedItemsContainer.innerHTML = `<p class="no-items-message">There are no used parts for sale at this time.</p>`;
        } else {
          items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'vs-item-card';

            card.innerHTML = `
              <img src="${item.photo_url || 'placeholder.png'}" alt="${item.title}" class="vs-item-image" />
              <h3 class="vs-item-title">${item.title}</h3>
              <p class="vs-item-description">${item.description}</p>
            `;

            usedItemsContainer.appendChild(card);
          });
        }
      } catch (error) {
        usedItemsContainer.innerHTML = `<p class="error">Could not load items: ${error.message}</p>`;
      }
    })();
  }

}); // end DOMContentLoaded


// ----------- EDIT MODAL HANDLERS (outside DOMContentLoaded) --------------

function openEditModal(item) {
  const modal = document.getElementById('editModal');
  if (!modal) return;
  modal.style.display = 'block';

  const editForm = modal.querySelector('form');
  if (!editForm) return;

  editForm.elements['id'].value = item.id;
  editForm.elements['title'].value = item.title;
  editForm.elements['description'].value = item.description;
  // photo input left empty intentionally (keep existing photo if blank)
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
  if (modal && event.target === modal) {
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
