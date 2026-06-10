class CollaborationManager {
  constructor() {
    this.comments = new Map();
    this.versionHistory = new Map();
    this.currentUserId = this._generateUserId();
    this._init();
  }

  _generateUserId() {
    let userId = localStorage.getItem('collab_user_id');
    if (!userId) {
      userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      localStorage.setItem('collab_user_id', userId);
    }
    return userId;
  }

  _init() {
    const savedComments = localStorage.getItem('collab_comments');
    if (savedComments) {
      try {
        const data = JSON.parse(savedComments);
        this.comments = new Map(Object.entries(data));
      } catch (e) {
        console.error('Failed to load comments:', e);
      }
    }

    const savedVersions = localStorage.getItem('collab_versions');
    if (savedVersions) {
      try {
        const data = JSON.parse(savedVersions);
        this.versionHistory = new Map(Object.entries(data));
      } catch (e) {
        console.error('Failed to load versions:', e);
      }
    }
  }

  _saveComments() {
    const data = Object.fromEntries(this.comments);
    localStorage.setItem('collab_comments', JSON.stringify(data));
  }

  _saveVersions() {
    const data = Object.fromEntries(this.versionHistory);
    localStorage.setItem('collab_versions', JSON.stringify(data));
  }

  addComment(projectId, targetType, targetId, content, position = null) {
    const commentId = 'comment_' + Date.now().toString(36);
    const comment = {
      id: commentId,
      projectId,
      targetType,
      targetId,
      content,
      author: this.currentUserId,
      timestamp: Date.now(),
      position,
      resolved: false,
      replies: []
    };

    const projectComments = this.comments.get(projectId) || [];
    projectComments.push(comment);
    this.comments.set(projectId, projectComments);
    this._saveComments();

    return commentId;
  }

  getComments(projectId, targetType = null, targetId = null) {
    const allComments = this.comments.get(projectId) || [];
    
    if (targetType && targetId) {
      return allComments.filter(c => c.targetType === targetType && c.targetId === targetId);
    }
    
    if (targetType) {
      return allComments.filter(c => c.targetType === targetType);
    }
    
    return allComments;
  }

  replyToComment(projectId, commentId, content) {
    const projectComments = this.comments.get(projectId) || [];
    const comment = projectComments.find(c => c.id === commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }

    const reply = {
      id: 'reply_' + Date.now().toString(36),
      author: this.currentUserId,
      content,
      timestamp: Date.now()
    };

    comment.replies.push(reply);
    this._saveComments();
    return reply.id;
  }

  resolveComment(projectId, commentId) {
    const projectComments = this.comments.get(projectId) || [];
    const comment = projectComments.find(c => c.id === commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }

    comment.resolved = true;
    this._saveComments();
  }

  deleteComment(projectId, commentId) {
    const projectComments = this.comments.get(projectId) || [];
    const filtered = projectComments.filter(c => c.id !== commentId);
    this.comments.set(projectId, filtered);
    this._saveComments();
  }

  saveVersion(projectId, data, reason = '自动保存') {
    const versionId = 'v_' + Date.now().toString(36);
    const version = {
      id: versionId,
      projectId,
      timestamp: Date.now(),
      reason,
      author: this.currentUserId,
      data: JSON.parse(JSON.stringify(data)),
      changes: this._detectChanges(projectId, data)
    };

    const projectVersions = this.versionHistory.get(projectId) || [];
    projectVersions.unshift(version);
    
    if (projectVersions.length > 50) {
      projectVersions.pop();
    }

    this.versionHistory.set(projectId, projectVersions);
    this._saveVersions();

    return versionId;
  }

  _detectChanges(projectId, newData) {
    const versions = this.versionHistory.get(projectId) || [];
    if (versions.length === 0) {
      return [{ type: 'create', field: 'project', description: '新建项目' }];
    }

    const previousData = versions[0].data;
    const changes = [];

    if (previousData.outline !== newData.outline) {
      changes.push({ type: 'update', field: 'outline', description: '修改大纲' });
    }

    if (previousData.script !== newData.script) {
      changes.push({ type: 'update', field: 'script', description: '修改剧本' });
    }

    if (JSON.stringify(previousData.shots) !== JSON.stringify(newData.shots)) {
      changes.push({ type: 'update', field: 'shots', description: '修改分镜' });
    }

    if (JSON.stringify(previousData.characters) !== JSON.stringify(newData.characters)) {
      changes.push({ type: 'update', field: 'characters', description: '修改角色' });
    }

    if (previousData.title !== newData.title) {
      changes.push({ type: 'update', field: 'title', description: '修改标题' });
    }

    if (previousData.description !== newData.description) {
      changes.push({ type: 'update', field: 'description', description: '修改描述' });
    }

    return changes.length > 0 ? changes : [{ type: 'update', field: 'unknown', description: '未知修改' }];
  }

  getVersions(projectId) {
    return this.versionHistory.get(projectId) || [];
  }

  getVersion(projectId, versionId) {
    const versions = this.versionHistory.get(projectId) || [];
    return versions.find(v => v.id === versionId);
  }

  compareVersions(projectId, versionId1, versionId2) {
    const versions = this.versionHistory.get(projectId) || [];
    const v1 = versions.find(v => v.id === versionId1);
    const v2 = versions.find(v => v.id === versionId2);

    if (!v1 || !v2) {
      throw new Error('Version not found');
    }

    const diffs = [];

    const fields = ['title', 'description', 'outline', 'script'];
    fields.forEach(field => {
      if (v1.data[field] !== v2.data[field]) {
        diffs.push({
          field,
          oldValue: v1.data[field],
          newValue: v2.data[field],
          type: 'text'
        });
      }
    });

    if (JSON.stringify(v1.data.shots) !== JSON.stringify(v2.data.shots)) {
      const shotDiffs = this._compareShots(v1.data.shots || [], v2.data.shots || []);
      diffs.push(...shotDiffs);
    }

    if (JSON.stringify(v1.data.characters) !== JSON.stringify(v2.data.characters)) {
      diffs.push({
        field: 'characters',
        oldValue: v1.data.characters,
        newValue: v2.data.characters,
        type: 'array'
      });
    }

    return {
      version1: v1,
      version2: v2,
      diffs
    };
  }

  _compareShots(oldShots, newShots) {
    const diffs = [];
    const oldMap = new Map(oldShots.map(s => [s.id, s]));
    const newMap = new Map(newShots.map(s => [s.id, s]));

    oldShots.forEach(shot => {
      if (!newMap.has(shot.id)) {
        diffs.push({
          field: 'shots',
          type: 'delete',
          description: `删除分镜: ${shot.id}`,
          data: shot
        });
      } else {
        const newShot = newMap.get(shot.id);
        const shotDiffs = [];
        
        Object.keys(shot).forEach(key => {
          if (shot[key] !== newShot[key]) {
            shotDiffs.push(key);
          }
        });

        if (shotDiffs.length > 0) {
          diffs.push({
            field: 'shots',
            type: 'update',
            description: `修改分镜: ${shot.id} (${shotDiffs.join(', ')})`,
            data: { old: shot, new: newShot }
          });
        }
      }
    });

    newShots.forEach(shot => {
      if (!oldMap.has(shot.id)) {
        diffs.push({
          field: 'shots',
          type: 'create',
          description: `新增分镜: ${shot.id}`,
          data: shot
        });
      }
    });

    return diffs;
  }

  restoreVersion(projectId, versionId) {
    const version = this.getVersion(projectId, versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    return JSON.parse(JSON.stringify(version.data));
  }

  exportComments(projectId) {
    const comments = this.getComments(projectId);
    return JSON.stringify(comments, null, 2);
  }

  importComments(projectId, commentsData) {
    try {
      const comments = JSON.parse(commentsData);
      this.comments.set(projectId, comments);
      this._saveComments();
      return comments.length;
    } catch (e) {
      throw new Error('Invalid comments data');
    }
  }

  getUserInfo() {
    return {
      userId: this.currentUserId,
      displayName: localStorage.getItem('collab_user_name') || '匿名用户'
    };
  }

  setUserInfo(displayName) {
    localStorage.setItem('collab_user_name', displayName);
  }

  clearProjectData(projectId) {
    this.comments.delete(projectId);
    this.versionHistory.delete(projectId);
    this._saveComments();
    this._saveVersions();
  }

  clearAllData() {
    this.comments.clear();
    this.versionHistory.clear();
    this._saveComments();
    this._saveVersions();
  }
}

const Collaboration = new CollaborationManager();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CollaborationManager, Collaboration };
}