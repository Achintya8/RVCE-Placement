const DROPDOWN_PREFIX = '__dropdown__:';
const FILE_PREFIX = '__file__:';

export const encodeQuestionText = ({ questionText, fieldType, options = [], folderLink = '' }) => {
  if (fieldType === 'dropdown') {
    return `${DROPDOWN_PREFIX}${JSON.stringify({
      label: questionText,
      options,
    })}`;
  }

  if (fieldType === 'file') {
    return `${FILE_PREFIX}${JSON.stringify({
      label: questionText,
      folderLink,
    })}`;
  }

  return questionText;
};

export const decodeQuestionText = (questionText, fieldType) => {
  if (fieldType === 'dropdown') {
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
  }

  if (fieldType === 'file') {
    if (!questionText?.startsWith(FILE_PREFIX)) {
      return {
        label: questionText,
        folderLink: '',
      };
    }

    try {
      const parsed = JSON.parse(questionText.slice(FILE_PREFIX.length));
      return {
        label: parsed.label ?? questionText,
        folderLink: parsed.folderLink ?? '',
      };
    } catch (error) {
      return {
        label: questionText,
        folderLink: '',
      };
    }
  }

  return {
    label: questionText,
    options: [],
    folderLink: '',
  };
};

