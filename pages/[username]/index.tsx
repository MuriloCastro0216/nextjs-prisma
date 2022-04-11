import React, { FC } from 'react';
import { GetServerSideProps } from 'next';
import PageLayout from 'layouts/PageLayout';
import { dehydrate, QueryClient } from 'react-query';
import ProfileView from 'views/Profile';
import { getUserByIdOrUsernameOrEmail } from 'pages/api/users/profile';
import { getPostsWithAuthor } from 'pages/api/posts';
import { User } from '@prisma/client';
import QueryKeys from 'lib-client/react-query/queryKeys';
import CustomHead from 'components/CustomHead';
import { getAvatarPathAbsolute } from 'lib-client/imageLoaders';
import { ssrNcHandler } from '@lib-server/nc';
import { PaginatedResponse, PostWithAuthor } from 'types';

type ProfileProps = {
  profile: User;
};

const Profile: FC<ProfileProps> = ({ profile }) => {
  return (
    <>
      <CustomHead
        title={profile.name}
        description={profile.name}
        image={getAvatarPathAbsolute(profile)}
      />
      <PageLayout noPaddingTop>
        <ProfileView profile={profile} />
      </PageLayout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ req, res, params }) => {
  const callback1 = async () => await getUserByIdOrUsernameOrEmail(params);
  const profile = await ssrNcHandler<User>(req, res, callback1);

  if (!profile) {
    return {
      notFound: true,
    };
  }

  const query = { username: profile.username };

  const callback2 = async () => await getPostsWithAuthor(query);
  // <PaginatedResponse<PostWithAuthor>>
  const posts = await ssrNcHandler(req, res, callback2);

  const queryClient = new QueryClient();
  await queryClient.prefetchQuery(
    [QueryKeys.POSTS_PROFILE, profile.username, 1],
    () => posts
  );

  return {
    props: {
      profile,
      dehydratedState: dehydrate(queryClient),
    },
  };
};

export default Profile;
