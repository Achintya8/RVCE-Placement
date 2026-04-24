const DROPDOWN_PREFIX = '__dropdown__:';

export const encodeQuestionText = ({ questionText, fieldType, options = [] }) => {
  if (fieldType !== 'dropdown') {
    return questionText;
  }

  return `${DROPDOWN_PREFIX}${JSON.stringify({
    label: questionText,
    options,
  })}`;
};

export const decodeQuestionText = (questionText, fieldType) => {
  if (fieldType !== 'dropdown') {
    return {
      label: questionText,
      options: [],
    };
  }

  if (!questionText?.startsWith(DROPDOWN_PREFIX)) {
    return {
      label: questionText,
      options: [],
    };
  }

  try {
    const parsed = JSON.parse(questionText.slice(DROPDOWN_PREFIX.length));
    return {
      label: parsed.label ?? questionText,
      options: Array.isArray(parsed.options) ? parsed.options : [],
    };
  } catch (error) {
    return {
      label: questionText,
      options: [],
    };
  }
};

