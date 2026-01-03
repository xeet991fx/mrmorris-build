import ContactList from '../models/ContactList';
import Contact from '../models/Contact';
import { Types } from 'mongoose';

interface ListFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists';
  value: any;
}

class SmartListService {
  /**
   * Build MongoDB query from filter conditions
   */
  buildQuery(workspaceId: string, conditions: ListFilter[], logic: 'AND' | 'OR' = 'AND') {
    const query: any = { workspaceId };

    if (!conditions || conditions.length === 0) {
      return query;
    }

    const criteriaArray = conditions.map(condition => {
      const { field, operator, value } = condition;
      const criteria: any = {};

      switch (operator) {
        case 'equals':
          criteria[field] = value;
          break;

        case 'not_equals':
          criteria[field] = { $ne: value };
          break;

        case 'contains':
          criteria[field] = { $regex: value, $options: 'i' };
          break;

        case 'not_contains':
          criteria[field] = { $not: { $regex: value, $options: 'i' } };
          break;

        case 'greater_than':
          criteria[field] = { $gt: value };
          break;

        case 'less_than':
          criteria[field] = { $lt: value };
          break;

        case 'in':
          criteria[field] = { $in: Array.isArray(value) ? value : [value] };
          break;

        case 'not_in':
          criteria[field] = { $nin: Array.isArray(value) ? value : [value] };
          break;

        case 'exists':
          criteria[field] = { $exists: true, $ne: null };
          break;

        case 'not_exists':
          criteria[field] = { $exists: false };
          break;
      }

      return criteria;
    });

    if (logic === 'AND') {
      Object.assign(query, ...criteriaArray);
    } else {
      query.$or = criteriaArray;
    }

    return query;
  }

  /**
   * Get contacts for a dynamic list
   */
  async getDynamicListContacts(
    workspaceId: string,
    conditions: ListFilter[],
    logic: 'AND' | 'OR' = 'AND',
    options: {
      page?: number;
      limit?: number;
      sort?: string;
    } = {}
  ) {
    const query = this.buildQuery(workspaceId, conditions, logic);

    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .sort(options.sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contact.countDocuments(query),
    ]);

    return {
      contacts,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get contact count for dynamic list
   */
  async getDynamicListCount(
    workspaceId: string,
    conditions: ListFilter[],
    logic: 'AND' | 'OR' = 'AND'
  ) {
    const query = this.buildQuery(workspaceId, conditions, logic);
    return await Contact.countDocuments(query);
  }

  /**
   * Create a new list
   */
  async createList(
    workspaceId: string,
    userId: string,
    data: {
      name: string;
      description?: string;
      type: 'static' | 'dynamic';
      contacts?: string[];
      filters?: {
        conditions: ListFilter[];
        logic: 'AND' | 'OR';
      };
      color?: string;
      icon?: string;
    }
  ) {
    const list = await ContactList.create({
      workspaceId,
      userId,
      ...data,
    });

    // If dynamic, calculate initial count
    if (data.type === 'dynamic' && data.filters) {
      const count = await this.getDynamicListCount(
        workspaceId,
        data.filters.conditions,
        data.filters.logic
      );
      list.cachedCount = count;
      list.lastCountUpdate = new Date();
      await list.save();
    }

    return list;
  }

  /**
   * Update list
   */
  async updateList(listId: string, updates: any) {
    const list = await ContactList.findById(listId);
    if (!list) {
      throw new Error('List not found');
    }

    Object.assign(list, updates);

    // Recalculate count if filters changed
    if (list.type === 'dynamic' && updates.filters) {
      const count = await this.getDynamicListCount(
        list.workspaceId.toString(),
        list.filters?.conditions || [],
        list.filters?.logic || 'AND'
      );
      list.cachedCount = count;
      list.lastCountUpdate = new Date();
    }

    await list.save();
    return list;
  }

  /**
   * Get all lists for workspace
   */
  async getLists(workspaceId: string) {
    return await ContactList.find({ workspaceId }).sort({ createdAt: -1 });
  }

  /**
   * Add contacts to static list
   */
  async addContactsToList(listId: string, contactIds: string[]) {
    const list = await ContactList.findById(listId);
    if (!list) {
      throw new Error('List not found');
    }

    if (list.type !== 'static') {
      throw new Error('Can only add contacts to static lists');
    }

    const objectIds = contactIds.map(id => new Types.ObjectId(id));
    list.contacts = [...new Set([...(list.contacts || []), ...objectIds])];
    await list.save();

    return list;
  }

  /**
   * Remove contacts from static list
   */
  async removeContactsFromList(listId: string, contactIds: string[]) {
    const list = await ContactList.findById(listId);
    if (!list) {
      throw new Error('List not found');
    }

    if (list.type !== 'static') {
      throw new Error('Can only remove contacts from static lists');
    }

    const removeIds = contactIds.map(id => id.toString());
    list.contacts = (list.contacts || []).filter(
      id => !removeIds.includes(id.toString())
    );
    await list.save();

    return list;
  }

  /**
   * Refresh cached count for dynamic list
   */
  async refreshListCount(listId: string) {
    const list = await ContactList.findById(listId);
    if (!list) {
      throw new Error('List not found');
    }

    if (list.type !== 'dynamic') {
      return list;
    }

    const count = await this.getDynamicListCount(
      list.workspaceId.toString(),
      list.filters?.conditions || [],
      list.filters?.logic || 'AND'
    );

    list.cachedCount = count;
    list.lastCountUpdate = new Date();
    await list.save();

    return list;
  }

  /**
   * Get list with contacts
   */
  async getListWithContacts(
    listId: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ) {
    const list = await ContactList.findById(listId);
    if (!list) {
      throw new Error('List not found');
    }

    if (list.type === 'static') {
      const page = options.page || 1;
      const limit = options.limit || 50;
      const skip = (page - 1) * limit;

      const contactIds = list.contacts || [];
      const paginatedIds = contactIds.slice(skip, skip + limit);

      const contacts = await Contact.find({
        _id: { $in: paginatedIds },
      }).lean();

      return {
        list,
        contacts,
        total: contactIds.length,
        page,
        pages: Math.ceil(contactIds.length / limit),
      };
    } else {
      // Dynamic list
      const result = await this.getDynamicListContacts(
        list.workspaceId.toString(),
        list.filters?.conditions || [],
        list.filters?.logic || 'AND',
        options
      );

      return {
        list,
        ...result,
      };
    }
  }

  /**
   * Delete list
   */
  async deleteList(listId: string) {
    await ContactList.findByIdAndDelete(listId);
  }
}

export const smartListService = new SmartListService();
export default smartListService;
