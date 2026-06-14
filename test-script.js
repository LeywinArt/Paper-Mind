
    // State representation
    let selectedContextType = 'all'; // 'all', 'folder', 'document'
    let selectedContextId = '';
    let selectedContextName = 'Entire Library';

    // UI Nodes
    const selectedContextText = document.getElementById('selectedContextText');
    const launchChatBtn = document.getElementById('launchChatBtn');
    const showFolderFormBtn = document.getElementById('showFolderFormBtn');
    const createFolderForm = document.getElementById('createFolderForm');
    const cancelFolderBtn = document.getElementById('cancelFolderBtn');
    const pdfFileInput = document.getElementById('pdfFileInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadFolderSelect = document.getElementById('uploadFolderSelect');
    const uploadProgressOverlay = document.getElementById('uploadProgressOverlay');

    // Update Chat Button Target Link
    function updateChatButton() {
      if (launchChatBtn) {
        let url = '/chat';
        if (selectedContextType !== 'all') {
          url += `?type=${selectedContextType}&id=${selectedContextId}`;
        }
        launchChatBtn.href = url;
      }
      if (selectedContextText) {
        selectedContextText.textContent = `${selectedContextName} (${
          selectedContextType === 'all' 
            ? 'All Documents' 
            : selectedContextType === 'folder' 
              ? 'Folder-Level' 
              : 'Single Document'
        })`;
      }
    }

    // 1. Folders: Toggle Form
    if (showFolderFormBtn && createFolderForm) {
      showFolderFormBtn.addEventListener('click', () => {
        createFolderForm.classList.toggle('hidden');
        document.getElementById('folderName')?.focus();
      });
    }

    if (cancelFolderBtn && createFolderForm) {
      cancelFolderBtn.addEventListener('click', () => {
        createFolderForm.classList.add('hidden');
      });
    }

    // Create Folder Submit
    if (createFolderForm) {
      createFolderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('folderName').value;
        const parent_id = document.getElementById('folderParent').value || null;
        
        const saveBtn = document.getElementById('sidebarSaveFolderBtn');
        if (saveBtn) {
          saveBtn.textContent = 'SAVING...';
          saveBtn.classList.add('opacity-50', 'pointer-events-none');
        }

        try {
          const response = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parent_id }),
          });

          if (response.ok) {
            window.showToast('Folder created successfully', 'success');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            const err = await response.json();
            window.showToast('Failed to create folder: ' + err.message, 'error');
            if (saveBtn) {
              saveBtn.textContent = 'SAVE';
              saveBtn.classList.remove('opacity-50', 'pointer-events-none');
            }
          }
        } catch (error) {
          console.error(error);
          window.showToast('Network error while creating folder.', 'error');
          if (saveBtn) {
            saveBtn.textContent = 'SAVE';
            saveBtn.classList.remove('opacity-50', 'pointer-events-none');
          }
        }
      });
    }

    // Delete Folder Click
    document.querySelectorAll('.delete-folder-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        if (!confirm('Are you sure you want to delete this folder and all its nested subfolders? Documents inside will remain, but their folder links will be removed.')) {
          return;
        }

        try {
          const response = await fetch(`/api/folders?id=${id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            window.showToast('Folder deleted successfully', 'success');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            window.showToast('Failed to delete folder.', 'error');
          }
        } catch (error) {
          console.error(error);
          window.showToast('Network error.', 'error');
        }
      });
    });

    // Folder Row Click Selection
    document.querySelectorAll('.folder-row').forEach(row => {
      row.addEventListener('click', (e) => {
        // Deselect previous
        document.querySelectorAll('.folder-row').forEach(r => r.classList.remove('bg-soft-stone', 'font-semibold', 'border-primary'));
        
        const el = e.currentTarget;
        el.classList.add('bg-soft-stone', 'font-semibold');
        
        const folderId = el.dataset.folderId;
        const folderName = el.dataset.folderName;

        if (folderId === 'all') {
          selectedContextType = 'all';
          selectedContextId = '';
          selectedContextName = 'Entire Library';
        } else {
          selectedContextType = 'folder';
          selectedContextId = folderId || '';
          selectedContextName = `Folder: ${folderName}`;
        }
        updateChatButton();
      });
    });

    // 2. Upload Handler
    if (browseBtn && pdfFileInput) {
      browseBtn.addEventListener('click', () => {
        pdfFileInput.click();
      });

      pdfFileInput.addEventListener('change', async () => {
        if (!pdfFileInput.files || pdfFileInput.files.length === 0) return;
        const file = pdfFileInput.files[0];
        
        // Check size limit (10MB)
        if (file.size > 10 * 1024 * 1024) {
          window.showToast('File size exceeds 10MB limit.', 'error');
          return;
        }

        const formData = new FormData();
        formData.append('file', file);
        if (uploadFolderSelect) {
          formData.append('folder_id', uploadFolderSelect.value);
        }

        if (uploadProgressOverlay) {
          uploadProgressOverlay.classList.remove('hidden');
        }

        try {
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            window.showToast('File uploaded successfully', 'success');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            const err = await response.json();
            window.showToast('Upload failed: ' + (err.message || 'Unknown processing error.'), 'error');
            if (uploadProgressOverlay) uploadProgressOverlay.classList.add('hidden');
          }
        } catch (error) {
          console.error(error);
          window.showToast('Network error during file upload.', 'error');
          if (uploadProgressOverlay) uploadProgressOverlay.classList.add('hidden');
        }
      });
    }

    // 3. Document Selection & Delete
    document.querySelectorAll('.document-row').forEach(row => {
      row.addEventListener('click', (e) => {
        // Deselect folders
        document.querySelectorAll('.folder-row').forEach(r => r.classList.remove('bg-soft-stone', 'font-semibold'));
        
        const el = e.currentTarget;
        const id = el.dataset.docId;
        const name = el.dataset.docName;

        selectedContextType = 'document';
        selectedContextId = id || '';
        selectedContextName = `Doc: ${name}`;
        updateChatButton();
      });
    });

    // Delete Document
    document.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        if (!confirm('Are you sure you want to delete this document and all its indexed vector chunks? This cannot be undone.')) {
          return;
        }

        try {
          const response = await fetch(`/api/documents/${id}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            window.showToast('Document deleted successfully', 'success');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            window.showToast('Failed to delete document.', 'error');
          }
        } catch (error) {
          console.error(error);
          window.showToast('Network error.', 'error');
        }
      });
    });

    // Drag and drop upload effects
    const uploadArea = pdfFileInput?.closest('div');
    if (uploadArea) {
      ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          uploadArea.classList.add('border-primary');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, (e) => {
          e.preventDefault();
          uploadArea.classList.remove('border-primary');
        }, false);
      });

      uploadArea.addEventListener('drop', async (e) => {
        const dt = e.dataTransfer;
        const files = dt?.files;
        if (files && files.length > 0 && pdfFileInput) {
          pdfFileInput.files = files;
          // Trigger the change handler
          pdfFileInput.dispatchEvent(new Event('change'));
        }
      });
    }

    // Folder Drag-and-Drop LocalStorage Reordering
    const folderLists = document.querySelectorAll('.sidebar-folder-list');
    folderLists.forEach(ul => {
      // Reorder based on localStorage
      const parentId = ul.dataset.parentId || 'root';
      const savedOrder = JSON.parse(localStorage.getItem('folderOrder') || '{}');
      const order = savedOrder[parentId];
      
      if (order && order.length > 0) {
        const items = Array.from(ul.children);
        items.sort((a, b) => {
          const idA = a.dataset.nodeId || '';
          const idB = b.dataset.nodeId || '';
          const idxA = order.indexOf(idA);
          const idxB = order.indexOf(idB);
          if (idxA === -1 && idxB === -1) return 0;
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
        items.forEach(item => ul.appendChild(item));
      }

      ul.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (!dragging || dragging.parentElement !== ul) return; // Only allow reordering within same level
        
        const afterElement = getDragAfterElement(ul, e.clientY);
        if (afterElement == null) {
          ul.appendChild(dragging);
        } else {
          ul.insertBefore(dragging, afterElement);
        }
      });

      ul.addEventListener('drop', (e) => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (!dragging) return;
        dragging.classList.remove('dragging', 'opacity-50');

        // Save new order to localStorage
        const newOrder = Array.from(ul.children).map(li => li.dataset.nodeId);
        const allOrders = JSON.parse(localStorage.getItem('folderOrder') || '{}');
        allOrders[parentId] = newOrder;
        localStorage.setItem('folderOrder', JSON.stringify(allOrders));
      });
    });

    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }

    document.querySelectorAll('li[data-node-id]').forEach(li => {
      li.setAttribute('draggable', 'true');
      li.addEventListener('dragstart', () => {
        li.classList.add('dragging', 'opacity-50');
      });
      li.addEventListener('dragend', () => {
        li.classList.remove('dragging', 'opacity-50');
      });
    });

    // Direct Folder Modal Logic
    const directFolderModal = document.getElementById('directFolderModal');
    const directFolderSaveBtn = document.getElementById('directFolderSaveBtn');
    
    if (directFolderSaveBtn) {
      directFolderSaveBtn.addEventListener('click', async () => {
        const input = document.getElementById('directFolderName');
        const name = input.value.trim();
        if (!name) return;
        
        directFolderSaveBtn.textContent = 'Creating...';
        directFolderSaveBtn.classList.add('opacity-50', 'pointer-events-none');

        const uploadFolderSelect = document.getElementById('uploadFolderSelect');
        try {
          const response = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parent_id: uploadFolderSelect ? uploadFolderSelect.value : null })
          });
          if (response.ok) {
            window.showToast('Folder created successfully', 'success');
            setTimeout(() => window.location.reload(), 1000);
          } else {
            const data = await response.json();
            window.showToast('Error: ' + data.message, 'error');
            directFolderSaveBtn.textContent = 'Create Folder';
            directFolderSaveBtn.classList.remove('opacity-50', 'pointer-events-none');
          }
        } catch (e) {
          window.showToast('Network error', 'error');
          directFolderSaveBtn.textContent = 'Create Folder';
          directFolderSaveBtn.classList.remove('opacity-50', 'pointer-events-none');
        }
      });
    }
