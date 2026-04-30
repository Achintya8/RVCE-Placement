import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../core/network/api_client.dart';
import '../features/auth/auth_controller.dart';
import '../features/shared/models.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(authControllerProvider).session!;
    final panels = <({String label, IconData icon, Widget child})>[
      (
        label: 'Profile',
        icon: Icons.badge_outlined,
        child: const _ProfilePanel(),
      ),
      (
        label: 'Companies',
        icon: Icons.apartment_outlined,
        child: const _CompaniesPanel(),
      ),
      (
        label: 'Forms',
        icon: Icons.dynamic_form_outlined,
        child: const _FormsPanel(),
      ),
      if (session.isSpc)
        (
          label: 'SPC Admin',
          icon: Icons.admin_panel_settings_outlined,
          child: const _AdminPanel(),
        ),
    ];

    final isWide = MediaQuery.of(context).size.width > 980;
    final activePanel = panels[_selectedIndex.clamp(0, panels.length - 1)];

    return Scaffold(
      backgroundColor: const Color(0xFFFFF9EF),
      bottomNavigationBar: isWide
          ? null
          : NavigationBar(
              selectedIndex: _selectedIndex,
              destinations: [
                for (final panel in panels)
                  NavigationDestination(
                    icon: Icon(panel.icon),
                    label: panel.label,
                  ),
              ],
              onDestinationSelected: (index) =>
                  setState(() => _selectedIndex = index),
            ),
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFFFF3D6), Color(0xFFF7E6DE)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: isWide
                ? Row(
                    children: [
                      SizedBox(
                        width: 280,
                        child: _SideRail(
                          session: session,
                          panels: panels,
                          selectedIndex: _selectedIndex,
                          onSelected: (index) =>
                              setState(() => _selectedIndex = index),
                        ),
                      ),
                      const SizedBox(width: 18),
                      Expanded(
                        child: Column(
                          children: [
                            _HeaderBar(session: session),
                            const SizedBox(height: 18),
                            Expanded(child: activePanel.child),
                          ],
                        ),
                      ),
                    ],
                  )
                : Column(
                    children: [
                      _HeaderBar(session: session),
                      const SizedBox(height: 16),
                      Expanded(child: activePanel.child),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

class _SideRail extends ConsumerWidget {
  const _SideRail({
    required this.session,
    required this.panels,
    required this.selectedIndex,
    required this.onSelected,
  });

  final Session session;
  final List<({String label, IconData icon, Widget child})> panels;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.78),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Placement Desk',
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              session.isSpc ? 'Student + SPC access' : 'Student access',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.black.withValues(alpha: 0.58),
              ),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: NavigationRail(
                backgroundColor: Colors.transparent,
                extended: true,
                selectedIndex: selectedIndex,
                groupAlignment: -1,
                onDestinationSelected: onSelected,
                destinations: [
                  for (final panel in panels)
                    NavigationRailDestination(
                      icon: Icon(panel.icon),
                      label: Text(panel.label),
                    ),
                ],
              ),
            ),
            FilledButton.icon(
              onPressed: () =>
                  ref.read(authControllerProvider.notifier).logout(),
              icon: const Icon(Icons.logout),
              label: const Text('Logout'),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeaderBar extends ConsumerWidget {
  const _HeaderBar({required this.session});

  final Session session;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome, ${session.user.name.isEmpty ? 'Student' : session.user.name}',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    session.isSpc
                        ? 'You can manage placement operations and still act as a student.'
                        : 'Keep your verified profile sharp and respond quickly to drives.',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.black.withValues(alpha: 0.65),
                    ),
                  ),
                ],
              ),
            ),
            if (MediaQuery.of(context).size.width > 980)
              OutlinedButton.icon(
                onPressed: () =>
                    ref.read(authControllerProvider.notifier).logout(),
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
              ),
          ],
        ),
      ),
    );
  }
}

class _ProfilePanel extends ConsumerStatefulWidget {
  const _ProfilePanel();

  @override
  ConsumerState<_ProfilePanel> createState() => _ProfilePanelState();
}

class _ProfilePanelState extends ConsumerState<_ProfilePanel> {
  late Future<AppUser> _future;
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _usnController = TextEditingController();
  final _collegeEmailController = TextEditingController();
  final _personalEmailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _aadharController = TextEditingController();
  final _linkedInController = TextEditingController();
  final _gitHubController = TextEditingController();
  final _cgpaController = TextEditingController();
  final _tenthController = TextEditingController();
  final _twelfthController = TextEditingController();
  final _firstSemController = TextEditingController();
  bool _hydrated = false;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _future = _loadProfile();
  }

  Future<AppUser> _loadProfile() =>
      ref.read(placementRepositoryProvider).getProfile();

  @override
  void dispose() {
    _nameController.dispose();
    _usnController.dispose();
    _collegeEmailController.dispose();
    _personalEmailController.dispose();
    _phoneController.dispose();
    _aadharController.dispose();
    _linkedInController.dispose();
    _gitHubController.dispose();
    _cgpaController.dispose();
    _tenthController.dispose();
    _twelfthController.dispose();
    _firstSemController.dispose();
    super.dispose();
  }

  Future<void> _save(AppUser currentUser) async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _saving = true);

    try {
      await ref.read(placementRepositoryProvider).updateProfile({
        'name': _nameController.text.trim(),
        'usn': _usnController.text.trim(),
        'collegeEmailId': _collegeEmailController.text.trim(),
        'personalEmailId': _personalEmailController.text.trim(),
        'phoneNumber': _phoneController.text.trim(),
        'aadhar': _aadharController.text.trim(),
        'linkedIn': _linkedInController.text.trim(),
        'gitHub': _gitHubController.text.trim(),
        'ugCgpa':
            double.tryParse(_cgpaController.text.trim()) ?? currentUser.ugCgpa,
        'tenthMarks':
            double.tryParse(_tenthController.text.trim()) ??
            currentUser.tenthMarks,
        'twelfthMarks':
            double.tryParse(_twelfthController.text.trim()) ??
            currentUser.twelfthMarks,
        'firstSemSgpa':
            double.tryParse(_firstSemController.text.trim()) ??
            currentUser.firstSemSgpa,
      });

      if (mounted) {
        setState(() {
          _future = _loadProfile();
          _hydrated = false;
        });
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Profile updated.')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractApiError(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  Future<void> _uploadResume() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        withData: true,
        type: FileType.custom,
        allowedExtensions: const ['pdf'],
      );

      if (result == null || result.files.isEmpty) {
        return;
      }

      await ref
          .read(placementRepositoryProvider)
          .uploadResume(result.files.first);
      if (mounted) {
        setState(() {
          _future = _loadProfile();
          _hydrated = false;
        });
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Resume uploaded.')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractApiError(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<AppUser>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return _ErrorState(
            message: extractApiError(
              snapshot.error ?? 'Failed to load profile.',
            ),
            onRetry: () => setState(() => _future = _loadProfile()),
          );
        }

        final user = snapshot.data!;
        final readOnly = user.verified || _saving;

        if (!_hydrated) {
          _nameController.text = user.name;
          _usnController.text = user.usn ?? '';
          _collegeEmailController.text = user.collegeEmailId;
          _personalEmailController.text = user.personalEmailId;
          _phoneController.text = user.phoneNumber ?? '';
          _aadharController.text = user.aadhar ?? '';
          _linkedInController.text = user.linkedIn ?? '';
          _gitHubController.text = user.gitHub ?? '';
          _cgpaController.text = user.ugCgpa == 0 ? '' : user.ugCgpa.toString();
          _tenthController.text = user.tenthMarks == 0
              ? ''
              : user.tenthMarks.toString();
          _twelfthController.text = user.twelfthMarks == 0
              ? ''
              : user.twelfthMarks.toString();
          _firstSemController.text = user.firstSemSgpa == 0
              ? ''
              : user.firstSemSgpa.toString();
          _hydrated = true;
        }

        return SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SectionCard(
                title: 'Profile Status',
                subtitle: user.verified
                    ? 'Your profile has been verified by SPC and is now read-only.'
                    : 'Complete the profile once and upload your latest resume before verification.',
                action: Wrap(
                  spacing: 12,
                  children: [
                    Chip(
                      label: Text(
                        user.verified ? 'Verified' : 'Awaiting verification',
                      ),
                      avatar: Icon(
                        user.verified ? Icons.verified : Icons.hourglass_bottom,
                        size: 18,
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: readOnly ? null : _uploadResume,
                      icon: const Icon(Icons.upload_file_outlined),
                      label: Text(
                        user.resumeUrl == null
                            ? 'Upload Resume'
                            : 'Replace Resume',
                      ),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (user.resumeUrl != null)
                      Text(
                        'Resume: ${user.resumeUrl}',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              _SectionCard(
                title: 'Academic Profile',
                subtitle:
                    'This data powers eligibility checks and company exports.',
                footer: Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton.icon(
                    onPressed: readOnly ? null : () => _save(user),
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Save profile'),
                  ),
                ),
                child: Form(
                  key: _formKey,
                  child: Wrap(
                    spacing: 16,
                    runSpacing: 16,
                    children: [
                      _FieldBox(
                        width: 260,
                        child: TextFormField(
                          controller: _nameController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(labelText: 'Name'),
                        ),
                      ),
                      _FieldBox(
                        width: 220,
                        child: TextFormField(
                          controller: _usnController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(labelText: 'USN'),
                        ),
                      ),
                      _FieldBox(
                        width: 280,
                        child: TextFormField(
                          controller: _collegeEmailController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(
                            labelText: 'College email',
                          ),
                        ),
                      ),
                      _FieldBox(
                        width: 280,
                        child: TextFormField(
                          controller: _personalEmailController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(
                            labelText: 'Personal email',
                          ),
                        ),
                      ),
                      _FieldBox(
                        width: 220,
                        child: TextFormField(
                          controller: _phoneController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(
                            labelText: 'Phone number',
                          ),
                        ),
                      ),
                      _FieldBox(
                        width: 220,
                        child: TextFormField(
                          controller: _aadharController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(
                            labelText: 'Aadhar',
                          ),
                        ),
                      ),
                      _FieldBox(
                        width: 280,
                        child: TextFormField(
                          controller: _linkedInController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(
                            labelText: 'LinkedIn URL',
                          ),
                        ),
                      ),
                      _FieldBox(
                        width: 280,
                        child: TextFormField(
                          controller: _gitHubController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(
                            labelText: 'GitHub URL',
                          ),
                        ),
                      ),
                      _FieldBox(
                        width: 180,
                        child: TextFormField(
                          controller: _cgpaController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(
                            labelText: 'UG CGPA',
                          ),
                        ),
                      ),
                      _FieldBox(
                        width: 180,
                        child: TextFormField(
                          controller: _firstSemController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(
                            labelText: '1st sem SGPA',
                          ),
                        ),
                      ),
                      _FieldBox(
                        width: 180,
                        child: TextFormField(
                          controller: _tenthController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(
                            labelText: '10th marks',
                          ),
                        ),
                      ),
                      _FieldBox(
                        width: 180,
                        child: TextFormField(
                          controller: _twelfthController,
                          enabled: !readOnly,
                          decoration: const InputDecoration(
                            labelText: '12th marks',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _CompaniesPanel extends ConsumerStatefulWidget {
  const _CompaniesPanel();

  @override
  ConsumerState<_CompaniesPanel> createState() => _CompaniesPanelState();
}

class _CompaniesPanelState extends ConsumerState<_CompaniesPanel> {
  late Future<List<Company>> _future;
  final Set<int> _busyCompanies = <int>{};

  @override
  void initState() {
    super.initState();
    _future = _loadCompanies();
  }

  Future<List<Company>> _loadCompanies() =>
      ref.read(placementRepositoryProvider).getCompanies();

  Future<void> _updateCompany(
    Company company, {
    bool? consent,
    bool? tracker,
  }) async {
    setState(() => _busyCompanies.add(company.id));
    try {
      await ref
          .read(placementRepositoryProvider)
          .saveApplication(
            companyId: company.id,
            consent: consent,
            tracker: tracker,
          );
      if (mounted) {
        setState(() => _future = _loadCompanies());
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractApiError(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _busyCompanies.remove(company.id));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Company>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return _ErrorState(
            message: extractApiError(
              snapshot.error ?? 'Failed to load companies.',
            ),
            onRetry: () => setState(() => _future = _loadCompanies()),
          );
        }

        final companies = snapshot.data!;
        return ListView.separated(
          itemCount: companies.length,
          separatorBuilder: (context, index) => const SizedBox(height: 18),
          itemBuilder: (context, index) {
            final company = companies[index];
            final isBusy = _busyCompanies.contains(company.id);

            return _SectionCard(
              title: company.name,
              subtitle:
                  "Package ${company.package.isEmpty ? 'TBD' : company.package} | Stipend ${company.stipend.isEmpty ? 'TBD' : company.stipend}",
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      _InfoPill(
                        label: 'Min CGPA',
                        value: company.minCgpa.toStringAsFixed(1),
                      ),
                      _InfoPill(
                        label: 'Test',
                        value: _formatDate(company.testDate),
                      ),
                      _InfoPill(
                        label: 'Interview',
                        value: _formatDate(company.interviewDate),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Wrap(
                    spacing: 18,
                    runSpacing: 12,
                    children: [
                      _ToggleCard(
                        title: 'Consent',
                        value: company.consent ?? false,
                        onChanged: isBusy
                            ? null
                            : (value) =>
                                  _updateCompany(company, consent: value),
                      ),
                      _ToggleCard(
                        title: 'Mail tracker',
                        value: company.tracker ?? false,
                        onChanged: isBusy
                            ? null
                            : (value) =>
                                  _updateCompany(company, tracker: value),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _FormsPanel extends ConsumerStatefulWidget {
  const _FormsPanel();

  @override
  ConsumerState<_FormsPanel> createState() => _FormsPanelState();
}

class _FormsPanelState extends ConsumerState<_FormsPanel> {
  late Future<List<PlacementFormSummary>> _future;

  @override
  void initState() {
    super.initState();
    _future = _loadForms();
  }

  Future<List<PlacementFormSummary>> _loadForms() =>
      ref.read(placementRepositoryProvider).getAssignedForms();

  Future<void> _openForm(PlacementFormSummary summary) async {
    try {
      final detail = await ref
          .read(placementRepositoryProvider)
          .getForm(summary.id);
      if (!mounted) {
        return;
      }

      final submitted = await showModalBottomSheet<bool>(
        context: context,
        isScrollControlled: true,
        builder: (_) => _DynamicFormSheet(detail: detail),
      );

      if (submitted == true && mounted) {
        setState(() => _future = _loadForms());
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractApiError(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<PlacementFormSummary>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return _ErrorState(
            message: extractApiError(snapshot.error ?? 'Failed to load forms.'),
            onRetry: () => setState(() => _future = _loadForms()),
          );
        }

        final forms = snapshot.data!;
        if (forms.isEmpty) {
          return const _EmptyState(
            icon: Icons.assignment_outlined,
            title: 'No forms yet',
            subtitle:
                'SPC-created forms will appear here as soon as they are shared.',
          );
        }

        return ListView.separated(
          itemCount: forms.length,
          separatorBuilder: (context, index) => const SizedBox(height: 18),
          itemBuilder: (context, index) {
            final form = forms[index];
            return _SectionCard(
              title: form.title,
              subtitle:
                  "${form.type.toUpperCase()} | ${form.companyName ?? 'Global'}",
              child: Row(
                children: [
                  Expanded(
                    child: Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        _InfoPill(
                          label: 'Questions',
                          value: '${form.questionCount ?? 0}',
                        ),
                        _InfoPill(
                          label: 'Responses',
                          value: '${form.responseCount ?? 0}',
                        ),
                      ],
                    ),
                  ),
                  FilledButton.icon(
                    onPressed: () => _openForm(form),
                    icon: const Icon(Icons.edit_note_outlined),
                    label: Text(
                      (form.responseCount ?? 0) > 0 ? 'Edit' : 'Fill',
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _AdminPanel extends ConsumerStatefulWidget {
  const _AdminPanel();

  @override
  ConsumerState<_AdminPanel> createState() => _AdminPanelState();
}

class _AdminPanelState extends ConsumerState<_AdminPanel> {
  late Future<_AdminData> _future;
  final _companyNameController = TextEditingController();
  final _companyCgpaController = TextEditingController();
  final _companyPackageController = TextEditingController();
  final _companyStipendController = TextEditingController();
  final _companyTestDateController = TextEditingController();
  final _companyInterviewDateController = TextEditingController();
  final _questionController = TextEditingController();
  final _dropdownOptionsController = TextEditingController();
  final _formTitleController = TextEditingController();
  String _questionType = 'text';
  String _formType = 'custom';
  int? _selectedCompanyId;
  int? _mappingFormId;
  final Map<int, bool> _mappedQuestions = <int, bool>{};
  final Set<int> _requiredQuestions = <int>{};
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _future = _loadData();
  }

  Future<_AdminData> _loadData() async {
    final repository = ref.read(placementRepositoryProvider);
    final companies = await repository.getCompanies();
    final questions = await repository.getQuestions();
    final forms = await repository.getAllForms();
    final students = await repository.getStudents();
    return _AdminData(
      companies: companies,
      questions: questions,
      forms: forms,
      students: students,
    );
  }

  @override
  void dispose() {
    _companyNameController.dispose();
    _companyCgpaController.dispose();
    _companyPackageController.dispose();
    _companyStipendController.dispose();
    _companyTestDateController.dispose();
    _companyInterviewDateController.dispose();
    _questionController.dispose();
    _dropdownOptionsController.dispose();
    _formTitleController.dispose();
    super.dispose();
  }

  Future<void> _runTask(
    Future<void> Function() task, {
    String? successMessage,
  }) async {
    setState(() => _busy = true);
    try {
      await task();
      if (mounted) {
        setState(() => _future = _loadData());
        if (successMessage != null) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(successMessage)));
        }
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractApiError(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _createCompany() async {
    await _runTask(() async {
      await ref
          .read(placementRepositoryProvider)
          .createCompany(
            name: _companyNameController.text.trim(),
            minCgpa: double.tryParse(_companyCgpaController.text.trim()) ?? 0,
            package: _companyPackageController.text.trim(),
            stipend: _companyStipendController.text.trim(),
            testDate: _companyTestDateController.text.trim().isEmpty
                ? null
                : _companyTestDateController.text.trim(),
            interviewDate: _companyInterviewDateController.text.trim().isEmpty
                ? null
                : _companyInterviewDateController.text.trim(),
          );
      _companyNameController.clear();
      _companyCgpaController.clear();
      _companyPackageController.clear();
      _companyStipendController.clear();
      _companyTestDateController.clear();
      _companyInterviewDateController.clear();
    }, successMessage: 'Company created.');
  }

  Future<void> _createQuestion() async {
    await _runTask(() async {
      final options = _dropdownOptionsController.text
          .split(',')
          .map((value) => value.trim())
          .where((value) => value.isNotEmpty)
          .toList();

      await ref
          .read(placementRepositoryProvider)
          .createQuestion(
            questionText: _questionController.text.trim(),
            fieldType: _questionType,
            options: options,
          );
      _questionController.clear();
      _dropdownOptionsController.clear();
    }, successMessage: 'Question created.');
  }

  Future<void> _createForm() async {
    await _runTask(() async {
      await ref
          .read(placementRepositoryProvider)
          .createForm(
            title: _formTitleController.text.trim(),
            type: _formType,
            companyId: _selectedCompanyId,
          );
      _formTitleController.clear();
    }, successMessage: 'Form created.');
  }

  Future<void> _saveMappings() async {
    if (_mappingFormId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Select a form to map questions.')),
      );
      return;
    }

    final questions = _mappedQuestions.entries
        .where((entry) => entry.value)
        .map(
          (entry) => {
            'questionId': entry.key,
            'isRequired': _requiredQuestions.contains(entry.key),
          },
        )
        .toList();

    await _runTask(() async {
      await ref
          .read(placementRepositoryProvider)
          .mapQuestionsToForm(formId: _mappingFormId!, questions: questions);
    }, successMessage: 'Form questions mapped.');
  }

  Future<void> _sendForm() async {
    if (_mappingFormId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Select a form to send.')));
      return;
    }

    await _runTask(() async {
      await ref.read(placementRepositoryProvider).sendForm(_mappingFormId!);
    }, successMessage: 'Form notifications sent.');
  }

  Future<void> _verifyStudent(int studentId) async {
    await _runTask(() async {
      await ref.read(placementRepositoryProvider).verifyStudent(studentId);
    }, successMessage: 'Student verified.');
  }

  Future<void> _exportCompany(int companyId) async {
    final availableFields = [
      {'key': 'usn', 'label': 'USN'},
      {'key': 'personal_email_id', 'label': 'Personal Email'},
      {'key': 'phone_number', 'label': 'Phone Number'},
      {'key': 'aadhar', 'label': 'Aadhar'},
      {'key': 'linkedIn', 'label': 'LinkedIn'},
      {'key': 'gitHub', 'label': 'GitHub'},
      {'key': 'tenth_marks', 'label': '10th Marks'},
      {'key': 'twelfth_marks', 'label': '12th Marks'},
      {'key': 'first_sem_sgpa', 'label': '1st Sem SGPA'},
    ];

    final selectedFields = await showDialog<List<String>>(
      context: context,
      builder: (context) {
        final selection = <String>{...availableFields.map((f) => f['key']!)};
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Text('Select Columns to Export'),
              content: SizedBox(
                width: 400,
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(bottom: 8.0),
                      child: Text(
                        'Name, College Email, CGPA, Resume URL, and Form Questions are always included.',
                      ),
                    ),
                    ...availableFields.map((field) {
                      final key = field['key']!;
                      return CheckboxListTile(
                        value: selection.contains(key),
                        title: Text(field['label']!),
                        dense: true,
                        onChanged: (val) {
                          setState(() {
                            if (val == true) {
                              selection.add(key);
                            } else {
                              selection.remove(key);
                            }
                          });
                        },
                      );
                    }),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, null),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(context, selection.toList()),
                  child: const Text('Export'),
                ),
              ],
            );
          },
        );
      },
    );

    if (selectedFields == null) return;

    await _runTask(() async {
      final Uint8List bytes = await ref
          .read(placementRepositoryProvider)
          .exportCompany(companyId, fields: selectedFields);
      final path = await ref
          .read(placementRepositoryProvider)
          .persistExportFile(companyId: companyId, bytes: bytes);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Excel exported to $path')));
      }
    });
  }

  Future<void> _exportFormResponses(int formId) async {
    await _runTask(() async {
      final Uint8List bytes = await ref
          .read(placementRepositoryProvider)
          .exportFormResponses(formId);
      final path = await ref
          .read(placementRepositoryProvider)
          .persistExportFile(companyId: formId, bytes: bytes); // We reuse persistExportFile, the name doesn't matter much or we can rename it. Actually, wait! The generated file name will be company_$formId.xlsx. Let me just use persistExportFile for now.
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Excel exported to $path')));
      }
    });
  }

  Future<void> _showResponses(int formId) async {
    try {
      final responses = await ref
          .read(placementRepositoryProvider)
          .getFormResponses(formId);
      if (!mounted) {
        return;
      }

      showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Form Responses'),
          content: SizedBox(
            width: double.maxFinite,
            child: responses.isEmpty
                ? const Text('No responses yet.')
                : SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: SingleChildScrollView(
                      scrollDirection: Axis.vertical,
                      child: DataTable(
                        columns: [
                          const DataColumn(label: Text('Name')),
                          const DataColumn(label: Text('Email')),
                          ...responses.first.answers.map(
                            (answer) => DataColumn(
                              label: Text(answer.questionText),
                            ),
                          ),
                        ],
                        rows: responses.map((response) {
                          return DataRow(
                            cells: [
                              DataCell(Text(response.studentName)),
                              DataCell(Text(response.collegeEmailId)),
                              ...response.answers.map(
                                (answer) => DataCell(Text(answer.answer ?? '-')),
                              ),
                            ],
                          );
                        }).toList(),
                      ),
                    ),
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
            if (responses.isNotEmpty)
              FilledButton.icon(
                onPressed: () {
                  Navigator.of(context).pop();
                  _exportFormResponses(formId);
                },
                icon: const Icon(Icons.download_outlined),
                label: const Text('Download Excel'),
              ),
          ],
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractApiError(error))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_AdminData>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError || !snapshot.hasData) {
          return _ErrorState(
            message: extractApiError(
              snapshot.error ?? 'Failed to load admin data.',
            ),
            onRetry: () => setState(() => _future = _loadData()),
          );
        }

        final data = snapshot.data!;
        return SingleChildScrollView(
          child: Column(
            children: [
              _SectionCard(
                title: 'Create Company',
                subtitle:
                    'Use ISO dates like 2026-06-12 to stay aligned with the backend.',
                footer: Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton(
                    onPressed: _busy ? null : _createCompany,
                    child: const Text('Create company'),
                  ),
                ),
                child: Wrap(
                  spacing: 16,
                  runSpacing: 16,
                  children: [
                    _FieldBox(
                      width: 220,
                      child: TextField(
                        controller: _companyNameController,
                        decoration: const InputDecoration(
                          labelText: 'Company name',
                        ),
                      ),
                    ),
                    _FieldBox(
                      width: 140,
                      child: TextField(
                        controller: _companyCgpaController,
                        decoration: const InputDecoration(
                          labelText: 'Min CGPA',
                        ),
                      ),
                    ),
                    _FieldBox(
                      width: 180,
                      child: TextField(
                        controller: _companyPackageController,
                        decoration: const InputDecoration(labelText: 'Package'),
                      ),
                    ),
                    _FieldBox(
                      width: 180,
                      child: TextField(
                        controller: _companyStipendController,
                        decoration: const InputDecoration(labelText: 'Stipend'),
                      ),
                    ),
                    _FieldBox(
                      width: 180,
                      child: TextField(
                        controller: _companyTestDateController,
                        decoration: const InputDecoration(
                          labelText: 'Test date',
                        ),
                      ),
                    ),
                    _FieldBox(
                      width: 180,
                      child: TextField(
                        controller: _companyInterviewDateController,
                        decoration: const InputDecoration(
                          labelText: 'Interview date',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              _SectionCard(
                title: 'Question Bank',
                subtitle:
                    'Dropdown options are stored without changing the schema.',
                footer: Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton(
                    onPressed: _busy ? null : _createQuestion,
                    child: const Text('Create question'),
                  ),
                ),
                child: Wrap(
                  spacing: 16,
                  runSpacing: 16,
                  children: [
                    _FieldBox(
                      width: 340,
                      child: TextField(
                        controller: _questionController,
                        decoration: const InputDecoration(
                          labelText: 'Question text',
                        ),
                      ),
                    ),
                    _FieldBox(
                      width: 180,
                      child: DropdownButtonFormField<String>(
                        initialValue: _questionType,
                        items: const ['text', 'number', 'boolean', 'dropdown']
                            .map(
                              (type) => DropdownMenuItem(
                                value: type,
                                child: Text(type),
                              ),
                            )
                            .toList(),
                        onChanged: _busy
                            ? null
                            : (value) => setState(
                                () => _questionType = value ?? 'text',
                              ),
                        decoration: const InputDecoration(
                          labelText: 'Field type',
                        ),
                      ),
                    ),
                    if (_questionType == 'dropdown')
                      _FieldBox(
                        width: 300,
                        child: TextField(
                          controller: _dropdownOptionsController,
                          decoration: const InputDecoration(
                            labelText: 'Options (comma separated)',
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              _SectionCard(
                title: 'Create and Send Forms',
                subtitle:
                    'Create a form, map reusable questions, then send a push notification.',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 16,
                      runSpacing: 16,
                      children: [
                        _FieldBox(
                          width: 260,
                          child: TextField(
                            controller: _formTitleController,
                            decoration: const InputDecoration(
                              labelText: 'Form title',
                            ),
                          ),
                        ),
                        _FieldBox(
                          width: 180,
                          child: DropdownButtonFormField<String>(
                            value: _formType,
                            items: const ['consent', 'tracker', 'custom']
                                .map(
                                  (type) => DropdownMenuItem(
                                    value: type,
                                    child: Text(type),
                                  ),
                                )
                                .toList(),
                            onChanged: _busy
                                ? null
                                : (value) => setState(
                                    () => _formType = value ?? 'custom',
                                  ),
                            decoration: const InputDecoration(
                              labelText: 'Form type',
                            ),
                          ),
                        ),
                        _FieldBox(
                          width: 240,
                          child: DropdownButtonFormField<int?>(
                            value: _selectedCompanyId,
                            items: [
                              const DropdownMenuItem<int?>(
                                value: null,
                                child: Text('Global'),
                              ),
                              ...data.companies.map(
                                (company) => DropdownMenuItem<int?>(
                                  value: company.id,
                                  child: Text(company.name),
                                ),
                              ),
                            ],
                            onChanged: _busy
                                ? null
                                : (value) => setState(
                                    () => _selectedCompanyId = value,
                                  ),
                            decoration: const InputDecoration(
                              labelText: 'Linked company',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton(
                        onPressed: _busy ? null : _createForm,
                        child: const Text('Create form'),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Wrap(
                      spacing: 16,
                      runSpacing: 16,
                      children: [
                        _FieldBox(
                          width: 260,
                          child: DropdownButtonFormField<int?>(
                            value: _mappingFormId,
                            items: [
                              const DropdownMenuItem<int?>(
                                value: null,
                                child: Text('Select a form'),
                              ),
                              ...data.forms.map(
                                (form) => DropdownMenuItem<int?>(
                                  value: form.id,
                                  child: Text(form.title),
                                ),
                              ),
                            ],
                            onChanged: _busy
                                ? null
                                : (value) =>
                                      setState(() => _mappingFormId = value),
                            decoration: const InputDecoration(
                              labelText: 'Form to map',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Wrap(
                      spacing: 16,
                      runSpacing: 16,
                      children: [
                        for (final question in data.questions)
                          SizedBox(
                            width: 320,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: const Color(0xFFFFFBF3),
                                borderRadius: BorderRadius.circular(18),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    CheckboxListTile(
                                      value:
                                          _mappedQuestions[question.id] ??
                                          false,
                                      dense: true,
                                      contentPadding: EdgeInsets.zero,
                                      title: Text(question.questionText),
                                      subtitle: Text(question.fieldType),
                                      onChanged: _busy
                                          ? null
                                          : (value) => setState(
                                              () =>
                                                  _mappedQuestions[question
                                                          .id] =
                                                      value ?? false,
                                            ),
                                    ),
                                    SwitchListTile(
                                      value: _requiredQuestions.contains(
                                        question.id,
                                      ),
                                      contentPadding: EdgeInsets.zero,
                                      title: const Text('Required'),
                                      onChanged:
                                          (_mappedQuestions[question.id] ??
                                                  false) &&
                                              !_busy
                                          ? (value) => setState(() {
                                              if (value) {
                                                _requiredQuestions.add(
                                                  question.id,
                                                );
                                              } else {
                                                _requiredQuestions.remove(
                                                  question.id,
                                                );
                                              }
                                            })
                                          : null,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 12,
                      children: [
                        FilledButton(
                          onPressed: _busy ? null : _saveMappings,
                          child: const Text('Save mapping'),
                        ),
                        OutlinedButton(
                          onPressed: _busy ? null : _sendForm,
                          child: const Text('Send notification'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              _SectionCard(
                title: 'Students',
                subtitle: 'Verify profiles to lock student edits.',
                child: Wrap(
                  spacing: 14,
                  runSpacing: 14,
                  children: [
                    for (final student in data.students)
                      SizedBox(
                        width: 320,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: Colors.black.withValues(alpha: 0.06),
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  student.name,
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 4),
                                Text(student.collegeEmailId),
                                const SizedBox(height: 10),
                                FilledButton.tonal(
                                  onPressed: student.verified || _busy
                                      ? null
                                      : () => _verifyStudent(student.id),
                                  child: Text(
                                    student.verified ? 'Verified' : 'Verify',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              _SectionCard(
                title: 'Exports and Responses',
                subtitle:
                    'Use the backend export endpoint and inspect responses per form.',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Companies',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        for (final company in data.companies)
                          OutlinedButton.icon(
                            onPressed: _busy
                                ? null
                                : () => _exportCompany(company.id),
                            icon: const Icon(Icons.file_download_outlined),
                            label: Text(company.name),
                          ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Forms',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        for (final form in data.forms)
                          OutlinedButton.icon(
                            onPressed: () => _showResponses(form.id),
                            icon: const Icon(Icons.visibility_outlined),
                            label: Text(form.title),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DynamicFormSheet extends ConsumerStatefulWidget {
  const _DynamicFormSheet({required this.detail});

  final PlacementFormDetail detail;

  @override
  ConsumerState<_DynamicFormSheet> createState() => _DynamicFormSheetState();
}

class _DynamicFormSheetState extends ConsumerState<_DynamicFormSheet> {
  final _formKey = GlobalKey<FormState>();
  final Map<int, TextEditingController> _controllers =
      <int, TextEditingController>{};
  final Map<int, dynamic> _answers = <int, dynamic>{};
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    for (final question in widget.detail.questions) {
      if (question.fieldType == 'text' || question.fieldType == 'number') {
        _controllers[question.id] = TextEditingController(
          text: question.answer ?? '',
        );
      } else {
        _answers[question.id] = question.answer;
      }
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final answers = <int, dynamic>{};
    for (final question in widget.detail.questions) {
      if (question.fieldType == 'text' || question.fieldType == 'number') {
        answers[question.id] = _controllers[question.id]!.text.trim();
      } else {
        answers[question.id] = _answers[question.id] ?? '';
      }
    }

    setState(() => _saving = true);
    try {
      await ref
          .read(placementRepositoryProvider)
          .submitFormResponses(
            formId: widget.detail.summary.id,
            answers: answers,
          );
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(extractApiError(error))));
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.82,
        builder: (context, controller) {
          return DecoratedBox(
            decoration: const BoxDecoration(
              color: Color(0xFFFFFBF3),
              borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            ),
            child: SingleChildScrollView(
              controller: controller,
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.detail.summary.title,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${widget.detail.summary.type.toUpperCase()} • ${widget.detail.summary.companyName ?? 'Global'}',
                    ),
                    const SizedBox(height: 24),
                    for (final question in widget.detail.questions) ...[
                      Text(
                        question.questionText,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 10),
                      _buildField(question),
                      const SizedBox(height: 18),
                    ],
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton.icon(
                        onPressed: _saving ? null : _submit,
                        icon: const Icon(Icons.send_outlined),
                        label: const Text('Submit responses'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildField(FormQuestion question) {
    if (question.fieldType == 'text') {
      return TextFormField(
        controller: _controllers[question.id],
        validator: (value) {
          if (question.isRequired && (value == null || value.trim().isEmpty)) {
            return 'Required';
          }
          return null;
        },
      );
    }

    if (question.fieldType == 'number') {
      return TextFormField(
        controller: _controllers[question.id],
        keyboardType: TextInputType.number,
        validator: (value) {
          if (question.isRequired && (value == null || value.trim().isEmpty)) {
            return 'Required';
          }
          return null;
        },
      );
    }

    if (question.fieldType == 'boolean') {
      return DropdownButtonFormField<String>(
        initialValue: question.answer,
        items: const [
          DropdownMenuItem(value: 'true', child: Text('Yes')),
          DropdownMenuItem(value: 'false', child: Text('No')),
        ],
        onChanged: (value) => _answers[question.id] = value,
        validator: (value) {
          if (question.isRequired && value == null) {
            return 'Required';
          }
          return null;
        },
      );
    }

    return DropdownButtonFormField<String>(
      initialValue: question.answer,
      items: question.options
          .map((option) => DropdownMenuItem(value: option, child: Text(option)))
          .toList(),
      onChanged: (value) => _answers[question.id] = value,
      validator: (value) {
        if (question.isRequired && (value == null || value.isEmpty)) {
          return 'Required';
        }
        return null;
      },
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({
    required this.title,
    required this.subtitle,
    required this.child,
    this.footer,
    this.action,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Widget? footer;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        subtitle,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.black.withValues(alpha: 0.65),
                        ),
                      ),
                    ],
                  ),
                ),
                ...[action].whereType<Widget>(),
              ],
            ),
            const SizedBox(height: 18),
            child,
            if (footer != null) ...[const SizedBox(height: 18), footer!],
          ],
        ),
      ),
    );
  }
}

class _FieldBox extends StatelessWidget {
  const _FieldBox({required this.width, required this.child});

  final double width;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SizedBox(width: width, child: child);
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBF3),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelMedium),
            Text(value, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      ),
    );
  }
}

class _ToggleCard extends StatelessWidget {
  const _ToggleCard({
    required this.title,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final bool value;
  final ValueChanged<bool>? onChanged;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(title),
            const SizedBox(width: 10),
            Switch(value: value, onChanged: onChanged),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 56),
          const SizedBox(height: 16),
          Text(title, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(subtitle, textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 56),
          const SizedBox(height: 16),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          FilledButton(onPressed: onRetry, child: const Text('Retry')),
        ],
      ),
    );
  }
}

class _AdminData {
  const _AdminData({
    required this.companies,
    required this.questions,
    required this.forms,
    required this.students,
  });

  final List<Company> companies;
  final List<FormQuestion> questions;
  final List<PlacementFormSummary> forms;
  final List<StudentSummary> students;
}

String _formatDate(String? rawDate) {
  if (rawDate == null || rawDate.isEmpty) {
    return 'TBD';
  }

  try {
    return DateFormat('dd MMM yyyy').format(DateTime.parse(rawDate));
  } catch (_) {
    return rawDate;
  }
}
