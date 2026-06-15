import { z } from 'zod';

import { listApplicationsForStudent } from '../repositories/application.repository.js';
import {
  createCompany,
  findCompanyById,
  listCompanies,
  listEligibleStudentsForCompany,
  updateCompanyStatus,
  updateCompanyBlocks,
  updateCompany,
  deleteCompany
} from '../repositories/company.repository.js';
import { generateCompanyWorkbook } from '../services/export.service.js';
import { ApiError } from '../utils/apiError.js';
import { listStudentIds } from '../repositories/user.repository.js';
import { sendToUsers } from '../services/notification.service.js';

const companySchema = z.object({
  name: z.string().min(1),
  minCgpa: z.coerce.number().min(0).max(10).optional().nullable(),
  minOverallCgpa: z.coerce.number().min(0).max(10).optional().nullable(),
  stipend: z.string().optional().nullable(),
  package: z.string().optional().nullable(),
  testDate: z.string().optional().nullable(),
  interviewDate: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  defaultConsent: z.boolean().optional().default(false),
});

export const getCompanies = async (req, res, next) => {
  try {
    const companies = await listCompanies(req.auth.userId);
    res.json(companies);
  } catch (error) {
    next(error);
  }
};

export const getCompany = async (req, res, next) => {
  try {
    const companyId = Number(req.params.id);
    const company = await findCompanyById(companyId, req.auth.userId);

    if (!company) {
      throw new ApiError(404, 'Company not found.');
    }

    res.json(company);
  } catch (error) {
    next(error);
  }
};

export const createCompanyRecord = async (req, res, next) => {
  try {
    const payload = companySchema.parse(req.body);
    const company = await createCompany({
      ...payload,
      createdBy: req.auth.userId,
    });

    // Notify all students
    const recipientIds = await listStudentIds();
    await sendToUsers({
      userIds: recipientIds,
      title: 'New Company',
      body: `${company.name} is now hiring! `,
      data: {
        type: 'new_company',
        companyId: String(company.id),
      },
    });

    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
};

export const getEligibleStudents = async (req, res, next) => {
  try {
    const companyId = Number(req.params.id);
    res.json(await listEligibleStudentsForCompany(companyId));
  } catch (error) {
    next(error);
  }
};

export const getMyApplications = async (req, res, next) => {
  try {
    res.json(await listApplicationsForStudent(req.auth.userId));
  } catch (error) {
    next(error);
  }
};

export const exportCompany = async (req, res, next) => {
  try {
    const companyId = Number(req.params.id);
    const fields = req.query.fields ? req.query.fields.split(',') : null;
    const workbook = await generateCompanyWorkbook(companyId, fields);

    const company = await findCompanyById(companyId);
    if (!company) {
      throw new ApiError(404, 'Company not found.');
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${company.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (status !== 'ongoing' && status !== 'completed') {
      throw new ApiError(400, 'Invalid status.');
    }

    const company = await findCompanyById(id);
    if (!company) {
      throw new ApiError(404, 'Company not found.');
    }

    const updated = await updateCompanyStatus(id, status);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const updateBlocks = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { consentBlocked, trackerBlocked } = req.body;

    if (typeof consentBlocked !== 'boolean' || typeof trackerBlocked !== 'boolean') {
      throw new ApiError(400, 'Invalid block values.');
    }

    const company = await findCompanyById(id);
    if (!company) {
      throw new ApiError(404, 'Company not found.');
    }

    const updated = await updateCompanyBlocks(id, consentBlocked, trackerBlocked);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const updateCompanyRecord = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const payload = companySchema.parse(req.body);
    const company = await findCompanyById(id);
    if (!company) {
      throw new ApiError(404, 'Company not found.');
    }
    const updated = await updateCompany(id, payload);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteCompanyRecord = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const company = await findCompanyById(id);
    if (!company) {
      throw new ApiError(404, 'Company not found.');
    }
    await deleteCompany(id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

