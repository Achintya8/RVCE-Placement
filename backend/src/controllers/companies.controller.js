import { z } from 'zod';

import { listApplicationsForStudent } from '../repositories/application.repository.js';
import { createCompany, findCompanyById, listCompanies, listEligibleStudentsForCompany } from '../repositories/company.repository.js';
import { generateCompanyWorkbook } from '../services/export.service.js';
import { ApiError } from '../utils/apiError.js';

const companySchema = z.object({
  name: z.string().min(1),
  minCgpa: z.coerce.number().min(0).max(10),
  stipend: z.string().optional().nullable(),
  package: z.string().optional().nullable(),
  testDate: z.string().optional().nullable(),
  interviewDate: z.string().optional().nullable(),
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
    const workbook = await generateCompanyWorkbook(companyId);

    if (!workbook) {
      throw new ApiError(404, 'Company not found.');
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename=company-${companyId}.xlsx`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

