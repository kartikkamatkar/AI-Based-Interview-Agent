package com.enigma.backend.submission;

import com.enigma.backend.submission.dto.CreateSubmissionRequest;
import com.enigma.backend.submission.dto.SubmissionResponse;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SubmissionService {

    private final SubmissionRepository submissionRepository;

    public SubmissionService(SubmissionRepository submissionRepository) {
        this.submissionRepository = submissionRepository;
    }

    @Transactional
    public SubmissionResponse create(CreateSubmissionRequest request) {
        Submission submission = new Submission();
        submission.setProblemId(request.problemId());
        submission.setLanguage(request.language());
        submission.setSourceCode(request.sourceCode());
        submission.setInput(request.input());
        submission.setStatus(SubmissionStatus.PENDING);

        Submission saved = submissionRepository.save(submission);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> getAll() {
        return submissionRepository.findAll(Sort.by(Sort.Direction.DESC, "id"))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SubmissionResponse getById(Long id) {
        Submission submission = submissionRepository.findById(id)
                .orElseThrow(() -> new SubmissionNotFoundException(id));
        return toResponse(submission);
    }

    private SubmissionResponse toResponse(Submission submission) {
        return new SubmissionResponse(
                submission.getId(),
                submission.getProblemId(),
                submission.getLanguage(),
                submission.getSourceCode(),
                submission.getInput(),
                submission.getStatus(),
                submission.getSubmittedAt()
        );
    }
}
