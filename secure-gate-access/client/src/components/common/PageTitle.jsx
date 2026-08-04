import { useEffect } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';

const PageTitle = ({ title }) => {
    const { setPageTitle } = useNavigation();

    useEffect(() => {
        if (title) {
            setPageTitle(title);
        }
    }, [title, setPageTitle]);

    return null;
};

export default PageTitle;
