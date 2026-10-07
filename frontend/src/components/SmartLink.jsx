import { Link } from 'react-router-dom';
import { isExternalUrl } from '../hooks/useStoreConfig';

const SmartLink = ({ to, children, ...rest }) => {
  if (!to) return <span {...rest}>{children}</span>;
  if (isExternalUrl(to)) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  );
};

export default SmartLink;
