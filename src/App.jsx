import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';

function App() {
  const [navData, setNavData] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Selection state now needs to track the full path or ID to find nested items
  // We'll store the `path` of the selected item as the unique identifier
  const [selectedPath, setSelectedPath] = useState(null);

  const sectionIndex = 0;

  const refreshData = async () => {
    try {
      const res = await fetch('/api/nav');
      const data = await res.json();
      setNavData(data);

      // Select first item by default if nothing selected
      if (!selectedPath && data[sectionIndex]?.items?.length > 0) {
        setSelectedPath(data[sectionIndex].items[0].path);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setStatus('Error loading data');
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Recursive Helper to find item and its parent array
  const findItemAndParent = (items, targetPath, parentArr = null) => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].path === targetPath) {
        return { item: items[i], index: i, parent: parentArr || items };
      }
      if (items[i].items && items[i].items.length > 0) {
        const found = findItemAndParent(items[i].items, targetPath, items[i].items);
        if (found) return found;
      }
    }
    return null;
  };

  // Get currently selected item object
  const getSelectedItem = () => {
    if (!navData.length || !selectedPath) return null;
    const items = navData[sectionIndex].items || [];
    const found = findItemAndParent(items, selectedPath);
    return found ? found.item : null;
  };

  const activeItem = getSelectedItem();

  const handleSave = async () => {
    if (!activeItem) return;

    setStatus('Saving...');
    try {
      const res = await fetch('/api/nav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(navData)
      });
      if (res.ok) {
        setStatus('Saved successfully!');
        setTimeout(() => setStatus(''), 2000);
      } else {
        setStatus('Error saving');
      }
    } catch (err) {
      console.error(err);
      setStatus('Error saving');
    }
  };

  // Helper to update specific field of selected item
  const updateSelectedItem = (field, value) => {
    const newNav = [...navData];
    const items = newNav[sectionIndex].items;

    // We need to mutate the item within the newNav structure
    const found = findItemAndParent(items, selectedPath);
    if (found) {
      found.parent[found.index] = { ...found.parent[found.index], [field]: value };
      setNavData(newNav);
    }
  };

  const handleRename = (newName) => updateSelectedItem('name', newName);
  const handleContentChange = (newContent) => updateSelectedItem('content', newContent);

  // Add Root Page
  const handleAddRoot = () => {
    const newNav = [...navData];

    // Initialize section if it doesn't exist (e.g. fresh start or load error)
    if (!newNav[sectionIndex]) {
      newNav[sectionIndex] = {
        name: 'Getting Started', // Default section name
        items: []
      };
    }

    const items = newNav[sectionIndex].items;
    const newItem = {
      name: `New Page`,
      path: `/docs/new-${Date.now()}`,
      content: '# New Page\n\nStarting writing...',
      items: []
    };
    items.push(newItem);
    setNavData(newNav);
    setSelectedPath(newItem.path);
  };

  // Add Child Page
  const handleAddChild = () => {
    if (!activeItem) return;
    const newNav = [...navData];
    const items = newNav[sectionIndex].items;
    const found = findItemAndParent(items, selectedPath);

    if (found) {
      const parentItem = found.parent[found.index];
      if (!parentItem.items) parentItem.items = [];

      const newItem = {
        name: `New Sub-page`,
        path: `${parentItem.path}/sub-${Date.now()}`,
        content: '# New Sub-page\n\nStarting writing...',
        items: []
      };
      parentItem.items.push(newItem);
      setNavData(newNav);
      // Expand parent and select child? For now just select child logic handles it
      // We might need expanded state if we implemented collapsing, but we show all for now
      setSelectedPath(newItem.path);
    }
  };

  const handleDelete = (e, path) => {
    e.stopPropagation();
    if (!confirm('Delete this page and all sub-pages?')) return;

    const newNav = [...navData];
    const items = newNav[sectionIndex].items;
    const found = findItemAndParent(items, path);

    if (found) {
      found.parent.splice(found.index, 1);
      setNavData(newNav);
      if (selectedPath === path) {
        setSelectedPath(null);
      }
    }
  };

  // Recursive Sidebar Item Renderer
  const renderSidebarItem = (item, depth = 0) => {
    const paddingLeft = 16 + (depth * 16);
    return (
      <div key={item.path}>
        <li
          className={`menu-item ${item.path === selectedPath ? 'active' : ''}`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => setSelectedPath(item.path)}
        >
          <span style={{ fontSize: depth > 0 ? '0.9em' : '1em' }}>
            {depth > 0 && '└ '} {item.name}
          </span>
          <button className="delete-btn" onClick={(e) => handleDelete(e, item.path)}>
            🗑️
          </button>
        </li>
        {item.items && item.items.map(child => renderSidebarItem(child, depth + 1))}
      </div>
    );
  };

  if (loading) return <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;

  const rootItems = navData[sectionIndex]?.items || [];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          LNB Manager
        </div>

        <ul className="menu-list">
          {rootItems.map(item => renderSidebarItem(item))}
        </ul>

        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="add-btn" onClick={handleAddRoot}>
            <span>+ New Root Page</span>
          </button>
          {activeItem && (
            <button className="add-btn" style={{ borderColor: '#64748b', color: '#64748b' }} onClick={handleAddChild}>
              <span>+ New Sub-Page to Selected</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="editor-container">
        {activeItem ? (
          <>
            <div className="editor-header">
              <input
                type="text"
                className="page-title"
                value={activeItem.name}
                onChange={(e) => handleRename(e.target.value)}
              />
              <button className="save-btn" onClick={handleSave}>
                Save Changes
              </button>
            </div>

            <div className="editor-content-split">
              {/* Left: Input */}
              <div className="editor-pane">
                <div className="content-label">Markdown Input</div>
                <textarea
                  className="markdown-editor"
                  value={activeItem.content || ''}
                  onChange={(e) => handleContentChange(e.target.value)}
                  spellCheck="false"
                  placeholder="# Type markdown here..."
                />
              </div>

              {/* Right: Preview */}
              <div className="preview-pane">
                <div className="content-label">Preview</div>
                <div className="markdown-preview prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeItem.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="editor-content" style={{ alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            Select a page from the sidebar
          </div>
        )}
      </main>

      {status && <div className="status-toast">{status}</div>}
    </div>
  );
}

export default App;
